const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const {
  create_pool,
  database_config,
  describe_database_config,
  explain_database_error,
} = require("./db");
const { queue_alert_notification } = require("./notificationService");
const { start_telegram_bot } = require("./telegramBot");

// Главный backend HydroPulse: HTTP API, авторизация, работа с PostgreSQL,
// прием измерений, формирование тревог и расчет прогноза уровня воды.
const app = express();

// Разрешаем запросы с React-приложения и принимаем JSON-тела POST/PUT-запросов.
app.use(cors());
app.use(express.json());

// Один пул подключений используется всеми API-ручками, чтобы не открывать
// новое соединение с PostgreSQL на каждый запрос.
const pool = create_pool();

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL client error:", explain_database_error(error));
});

// AUTH_SECRET подписывает локальный JWT-подобный токен, TOKEN_TTL_MS задает
// срок жизни сессии пользователя в интерфейсе администратора.
const AUTH_SECRET = process.env.AUTH_SECRET || "hydropulse-local-dev-secret";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 8;

// Описание таблиц для универсальной админки. Frontend получает этот список
// через /api/db/tables и строит формы без жестко прописанной схемы на клиенте.
const TABLE_DEFINITIONS = {
  water_bodies: {
    primary_key: "id",
    columns: [
      { name: "name", type: "text", required: true },
      { name: "water_body_type", type: "text", required: true },
      { name: "basin", type: "text" },
    ],
  },
  settlements: {
    primary_key: "id",
    columns: [
      { name: "name", type: "text", required: true },
      { name: "region", type: "text" },
      { name: "district", type: "text" },
    ],
  },
  monitoring_stations: {
    primary_key: "id",
    columns: [
      { name: "water_body_id", type: "number", required: true },
      { name: "settlement_id", type: "number" },
      { name: "name", type: "text", required: true },
      { name: "station_code", type: "text" },
      { name: "latitude", type: "number" },
      { name: "longitude", type: "number" },
      { name: "danger_level_cm", type: "number" },
      { name: "critical_level_cm", type: "number" },
      { name: "sensor_height_cm", type: "number" },
      { name: "sensor_angle_deg", type: "number" },
      { name: "is_active", type: "boolean" },
    ],
  },
  sensors: {
    primary_key: "sensor_id",
    columns: [
      { name: "sensor_id", type: "text", insert_only: true, required: true },
      { name: "monitoring_station_id", type: "number", required: true },
      { name: "name", type: "text" },
      { name: "sensor_type", type: "text" },
      { name: "is_active", type: "boolean" },
    ],
  },
  water_level_measurements: {
    primary_key: "id",
    columns: [
      { name: "sensor_id", type: "text", required: true },
      { name: "packet_id", type: "number" },
      { name: "distance_cm", type: "number", required: true },
      { name: "water_level_cm", type: "number" },
      { name: "hop_count", type: "number" },
      { name: "rssi", type: "number" },
      { name: "snr", type: "number" },
      { name: "measured_at", type: "datetime" },
    ],
  },
  alerts: {
    primary_key: "id",
    columns: [
      { name: "monitoring_station_id", type: "number", required: true },
      { name: "measurement_id", type: "number" },
      { name: "alert_type", type: "text", required: true },
      { name: "message", type: "text", required: true },
      { name: "resolved_at", type: "datetime" },
    ],
  },
};

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

// Формируем простой JWT-формат вручную: header.payload.signature.
// Подпись HMAC-SHA256 защищает токен от подмены роли или id пользователя.
function sign_token(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

function verify_token(token) {
  if (!token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.expires_at && Date.now() > payload.expires_at) return null;
  return payload;
}

// Пароли пользователей хранятся не открытым текстом, а как scrypt-хэш с солью.
function hash_password(password, salt = crypto.randomBytes(16).toString("hex")) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, 64, (error, derived_key) => {
      if (error) reject(error);
      else resolve(`scrypt:${salt}:${derived_key.toString("hex")}`);
    });
  });
}

async function verify_password(password, password_hash) {
  const [, salt, hash] = String(password_hash || "").split(":");
  if (!salt || !hash) return false;

  const candidate = await hash_password(password, salt);
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(password_hash));
}

function public_user(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
  };
}

// Middleware достает Bearer-токен, проверяет подпись и подгружает пользователя из БД.
async function authenticate(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const payload = verify_token(token);

    if (!payload) {
      return res.status(401).json({ error: "auth_required" });
    }

    const result = await pool.query(
      "SELECT id, username, role FROM users WHERE id = $1 LIMIT 1",
      [payload.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "auth_required" });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "auth_required" });
  }
}

// Отдельная проверка роли нужна для операций изменения данных в админке.
function require_admin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "admin_required" });
  }
  next();
}

function get_table_definition(table_name) {
  const definition = TABLE_DEFINITIONS[table_name];
  if (!definition) {
    const error = new Error("unknown_table");
    error.status = 404;
    throw error;
  }
  return definition;
}

// Приводим входные значения из HTML-форм/JSON к типам, указанным в TABLE_DEFINITIONS.
function coerce_value(value, column) {
  if (value === "" || value === undefined) return null;
  if (value === null) return null;

  if (column.type === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`invalid_${column.name}`);
    return parsed;
  }

  if (column.type === "boolean") {
    return value === true || value === "true" || value === "1" || value === 1;
  }

  if (column.type === "datetime") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error(`invalid_${column.name}`);
    return date;
  }

  return String(value).trim();
}

// Собираем безопасный payload только из разрешенных колонок конкретной таблицы.
function build_payload(body, definition, { include_insert_only = true } = {}) {
  const payload = {};

  definition.columns.forEach((column) => {
    if (!include_insert_only && column.insert_only) return;
    if (!Object.prototype.hasOwnProperty.call(body, column.name)) return;

    const value = coerce_value(body[column.name], column);
    if (column.required && (value === null || value === "")) {
      throw new Error(`${column.name}_required`);
    }

    payload[column.name] = value;
  });

  return payload;
}

// При первом запуске создаем таблицу пользователей и дефолтные учетные записи.
// Это позволяет открыть админку даже после чистой установки базы.
async function ensure_auth_schema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const admin_username = process.env.DEFAULT_ADMIN_USERNAME || "admin";
  const admin_password = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
  const viewer_username = process.env.DEFAULT_VIEWER_USERNAME || "viewer";
  const viewer_password = process.env.DEFAULT_VIEWER_PASSWORD || "viewer123";

  const count = await pool.query("SELECT count(*)::int AS total FROM users");
  if (count.rows[0].total > 0) return;

  await pool.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, 'admin'), ($3, $4, 'viewer')`,
    [
      admin_username,
      await hash_password(admin_password),
      viewer_username,
      await hash_password(viewer_password),
    ]
  );
}

function to_number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Переводим расстояние от ультразвукового датчика до воды в уровень воды.
// Если известна высота установки датчика, уровень = высота - проекция расстояния.
// Угол учитывается через cos(angle), чтобы корректно считать наклонный датчик.
function calculate_water_level(distance_cm, sensor_height_cm, sensor_angle_deg) {
  const distance = to_number(distance_cm);
  const height = to_number(sensor_height_cm);
  const angle = to_number(sensor_angle_deg) || 0;

  if (distance === null) {
    throw new Error("invalid_distance_cm");
  }

  if (height === null) {
    return distance;
  }

  const angle_rad = (angle * Math.PI) / 180;
  return Number((height - distance * Math.cos(angle_rad)).toFixed(2));
}

// Статус уровня строится по двум порогам гидропоста: опасному и критическому.
function get_status(water_level_cm, danger_level_cm, critical_level_cm) {
  if (water_level_cm === null || water_level_cm === undefined) return "no_data";
  if (critical_level_cm !== null && critical_level_cm !== undefined && water_level_cm >= critical_level_cm) {
    return "critical";
  }
  if (danger_level_cm !== null && danger_level_cm !== undefined && water_level_cm >= danger_level_cm) {
    return "danger";
  }
  return "normal";
}

// Ниже идут маленькие статистические помощники для прогнозной модели.
function average(values) {
  const source = values.filter((value) => Number.isFinite(value));
  if (source.length === 0) return null;
  return source.reduce((sum, value) => sum + value, 0) / source.length;
}

function median(values) {
  const source = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (source.length === 0) return null;
  const middle = Math.floor(source.length / 2);
  return source.length % 2 ? source[middle] : (source[middle - 1] + source[middle]) / 2;
}

function standard_deviation(values) {
  const source = values.filter((value) => Number.isFinite(value));
  if (source.length < 2) return 0;
  const avg = average(source);
  const variance = source.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (source.length - 1);
  return Math.sqrt(variance);
}

function clamp_number(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

function clamp_integer(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

function clamp_float(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function forecast_label(hour) {
  return Number.isInteger(hour) ? `+${hour}ч` : `+${hour.toFixed(1)}ч`;
}

// Взвешенная линейная регрессия оценивает базовый тренд уровня воды.
// Поздние точки получают больший вес, потому что свежие замеры важнее старых.
function weighted_linear_regression(samples) {
  if (samples.length < 2) {
    return {
      intercept: samples[0] ? samples[0].y : 0,
      rate: 0,
      r2: 0,
      residual_std: 0,
    };
  }

  const weighted = samples.map((sample, index) => ({
    ...sample,
    weight: 1 + (index / Math.max(samples.length - 1, 1)) * 2,
  }));
  const weight_sum = weighted.reduce((sum, sample) => sum + sample.weight, 0);
  const avg_x = weighted.reduce((sum, sample) => sum + sample.x * sample.weight, 0) / weight_sum;
  const avg_y = weighted.reduce((sum, sample) => sum + sample.y * sample.weight, 0) / weight_sum;
  const numerator = weighted.reduce(
    (sum, sample) => sum + sample.weight * (sample.x - avg_x) * (sample.y - avg_y),
    0
  );
  const denominator = weighted.reduce(
    (sum, sample) => sum + sample.weight * (sample.x - avg_x) ** 2,
    0
  );
  const rate = denominator > 0 ? numerator / denominator : 0;
  const intercept = avg_y - rate * avg_x;
  const residuals = weighted.map((sample) => sample.y - (intercept + rate * sample.x));
  const ss_res = residuals.reduce((sum, value) => sum + value ** 2, 0);
  const ss_tot = weighted.reduce((sum, sample) => sum + (sample.y - avg_y) ** 2, 0);

  return {
    intercept,
    rate,
    r2: ss_tot > 0 ? clamp_number(1 - ss_res / ss_tot, 0, 1) : 0,
    residual_std: standard_deviation(residuals),
  };
}

// Превращаем строки БД в обучающие точки: x — часы от первого замера, y — уровень воды.
function build_forecast_samples(rows) {
  if (!rows.length) return [];
  const first_time = new Date(rows[0].measured_at).getTime();

  return rows
    .map((row) => ({
      x: (new Date(row.measured_at).getTime() - first_time) / 1000 / 3600,
      y: Number(row.water_level_cm),
      measured_at: row.measured_at,
    }))
    .filter((sample) => Number.isFinite(sample.x) && Number.isFinite(sample.y));
}

// Скоростной профиль показывает, как быстро менялся уровень между соседними замерами.
function build_velocity_profile(samples) {
  const velocities = [];

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const delta_hours = current.x - previous.x;

    if (delta_hours > 0) {
      velocities.push((current.y - previous.y) / delta_hours);
    }
  }

  return velocities;
}

// Находит примерное время до порога по точкам прогноза. Если порог пересекается
// между двумя прогнозными точками, время уточняется линейной интерполяцией.
function estimate_hours_to_threshold(last_level, threshold, forecast_points, field) {
  if (last_level === null || threshold === null) return null;
  if (last_level >= threshold) return 0;

  let previous_hours = 0;
  let previous_level = last_level;

  for (const point of forecast_points) {
    const current_level = Number(point[field]);
    const current_hours = Number(point.forecast_horizon_hours);

    if (!Number.isFinite(current_level) || !Number.isFinite(current_hours)) continue;
    if (current_level >= threshold) {
      const delta_level = current_level - previous_level;
      if (delta_level <= 0) return current_hours;
      const ratio = (threshold - previous_level) / delta_level;
      return previous_hours + (current_hours - previous_hours) * ratio;
    }

    previous_level = current_level;
    previous_hours = current_hours;
  }

  return null;
}

// Простая оценка доверия к прогнозу: чем больше данных, длиннее история,
// выше R² и ниже разброс/волатильность, тем выше confidence.
function forecast_confidence(sample_count, time_span_hours, r2, residual_std, velocity_volatility) {
  let score = 0;

  if (sample_count >= 20) score += 2;
  else if (sample_count >= 10) score += 1;

  if (time_span_hours >= 6) score += 2;
  else if (time_span_hours >= 1) score += 1;

  if (r2 >= 0.75) score += 2;
  else if (r2 >= 0.45) score += 1;

  if (residual_std <= 8) score += 1;
  if (velocity_volatility <= 12) score += 1;

  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

// Основная модель прогноза:
// 1. Берет отдельное окно замеров для расчета модели.
// 2. На график выводит только компактную часть фактической истории.
// 3. Считает взвешенный линейный тренд.
// 4. Добавляет скорость последних измерений, чтобы реагировать на свежий подъем.
// 5. Оценивает ускорение тренда и коридор неопределенности.
// 6. Возвращает фактические и прогнозные точки на заданный горизонт.
function build_forecast_response(sensor_id, station, rows, options = {}) {
  const history_limit = options.history_limit || 24;
  const horizon_hours = options.horizon_hours || 12;
  const forecast_step_hours = options.forecast_step_hours || 1;
  const samples = build_forecast_samples(rows);
  const regression = weighted_linear_regression(samples);
  const velocities = build_velocity_profile(samples);
  const recent_rate = median(velocities.slice(-4));
  const rate = recent_rate === null ? regression.rate : regression.rate * 0.65 + recent_rate * 0.35;
  const recent_velocity = average(velocities.slice(-4));
  const previous_velocity = average(velocities.slice(0, Math.max(velocities.length - 4, 0)));
  const time_span_hours = samples.length >= 2 ? samples[samples.length - 1].x - samples[0].x : 0;
  const acceleration =
    recent_velocity === null || previous_velocity === null
      ? 0
      : clamp_number((recent_velocity - previous_velocity) / Math.max(time_span_hours / 2, 1), -3, 3);
  const velocity_volatility = standard_deviation(velocities);
  const last_sample = samples[samples.length - 1];
  const last_level = last_sample ? last_sample.y : null;
  const danger = station.danger_level_cm === null ? null : Number(station.danger_level_cm);
  const critical = station.critical_level_cm === null ? null : Number(station.critical_level_cm);
  const visible_rows = rows.slice(-history_limit);

  const points = visible_rows.map((item) => ({
    label: new Date(item.measured_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    water_level_cm: Number(item.water_level_cm),
    forecast_level_cm: null,
    forecast_lower_cm: null,
    forecast_upper_cm: null,
    forecast_horizon_hours: null,
  }));

  for (let hour = forecast_step_hours; hour <= horizon_hours + 0.0001; hour += forecast_step_hours) {
    const normalized_hour = Number(hour.toFixed(2));
    // Формула движения: уровень = текущий уровень + скорость * время + 1/2 * ускорение * время².
    const forecast_level =
      last_level === null
        ? null
        : Math.max(0, last_level + rate * normalized_hour + 0.5 * acceleration * normalized_hour * normalized_hour);
    // Коридор риска расширяется с горизонтом прогноза: чем дальше вперед,
    // тем сильнее учитываются остаточная ошибка модели, волатильность и ускорение.
    const uncertainty =
      regression.residual_std +
      velocity_volatility * Math.sqrt(normalized_hour) * 0.6 +
      Math.abs(acceleration) * normalized_hour * 0.4;

    points.push({
      label: forecast_label(normalized_hour),
      water_level_cm: null,
      forecast_level_cm: forecast_level === null ? null : Number(forecast_level.toFixed(2)),
      forecast_lower_cm: forecast_level === null ? null : Number(Math.max(0, forecast_level - uncertainty).toFixed(2)),
      forecast_upper_cm: forecast_level === null ? null : Number((forecast_level + uncertainty).toFixed(2)),
      forecast_horizon_hours: normalized_hour,
    });
  }

  const future_points = points.filter((point) => point.forecast_horizon_hours !== null);
  const hours_to_critical = estimate_hours_to_threshold(last_level, critical, future_points, "forecast_level_cm");
  const hours_to_danger = estimate_hours_to_threshold(last_level, danger, future_points, "forecast_level_cm");
  const risk_hours_to_critical = estimate_hours_to_threshold(last_level, critical, future_points, "forecast_upper_cm");
  const confidence = forecast_confidence(
    samples.length,
    time_span_hours,
    regression.r2,
    regression.residual_std,
    velocity_volatility
  );

  let warning = "Недостаточно данных";
  if (last_level !== null) {
    if (critical !== null && last_level >= critical) warning = "Критический уровень уже достигнут";
    else if (hours_to_critical !== null && hours_to_critical <= 6) warning = "Критический уровень вероятен в ближайшие 6 часов";
    else if (risk_hours_to_critical !== null && risk_hours_to_critical <= 6) warning = "Есть риск достижения критического уровня по верхнему коридору";
    else if (hours_to_danger !== null && hours_to_danger <= 6) warning = "Опасный уровень вероятен в ближайшие 6 часов";
    else if (rate > 0.05) warning = "Уровень растет";
    else if (rate < -0.05) warning = "Уровень снижается";
    else warning = "Рост не зафиксирован";
  }

  return {
    sensor_id,
    monitoring_station_name: station.monitoring_station_name,
    danger_level_cm: station.danger_level_cm,
    critical_level_cm: station.critical_level_cm,
    rise_rate_cm_per_hour: Number(rate.toFixed(2)),
    acceleration_cm_per_hour2: Number(acceleration.toFixed(2)),
    residual_std_cm: Number(regression.residual_std.toFixed(2)),
    velocity_volatility_cm_per_hour: Number(velocity_volatility.toFixed(2)),
    hours_to_danger: hours_to_danger === null ? null : Number(hours_to_danger.toFixed(2)),
    hours_to_critical: hours_to_critical === null ? null : Number(hours_to_critical.toFixed(2)),
    risk_hours_to_critical: risk_hours_to_critical === null ? null : Number(risk_hours_to_critical.toFixed(2)),
    sample_count: samples.length,
    displayed_sample_count: visible_rows.length,
    forecast_point_count: future_points.length,
    forecast_horizon_hours: horizon_hours,
    forecast_step_hours,
    time_span_hours: Number(time_span_hours.toFixed(2)),
    confidence,
    model: "weighted_regression_with_recent_velocity",
    model_label: "взвешенный тренд + скорость последних замеров",
    warning,
    points,
  };
}

async function create_alert_if_needed(client, station, measurement, status) {
  // Если уровень вернулся в норму, закрываем все активные тревоги по гидропосту.
  if (status === "normal") {
    await client.query(
      `UPDATE alerts
       SET resolved_at = now()
       WHERE monitoring_station_id = $1
         AND resolved_at IS NULL`,
      [station.monitoring_station_id]
    );
    return null;
  }

  // Критическая тревога сильнее опасной, поэтому старую danger-тревогу закрываем.
  if (status === "critical") {
    await client.query(
      `UPDATE alerts
       SET resolved_at = now()
       WHERE monitoring_station_id = $1
         AND alert_type = 'danger'
         AND resolved_at IS NULL`,
      [station.monitoring_station_id]
    );
  }

  // Не создаем дубль, если такая активная тревога уже есть.
  const existing = await client.query(
    `SELECT id
     FROM alerts
     WHERE monitoring_station_id = $1
       AND alert_type = $2
       AND resolved_at IS NULL
     LIMIT 1`,
    [station.monitoring_station_id, status]
  );

  if (existing.rows.length > 0) return null;

  const message =
    status === "critical"
      ? `Критический уровень воды: ${measurement.water_level_cm} см`
      : `Опасный уровень воды: ${measurement.water_level_cm} см`;

  const result = await client.query(
    `INSERT INTO alerts (
       monitoring_station_id,
       measurement_id,
       alert_type,
       message
     )
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [station.monitoring_station_id, measurement.id, status, message]
  );

  return result.rows[0];
}

async function insert_measurement(payload) {
  const sensor_id = String(payload.sensor_id || "").trim();
  const distance_cm = to_number(payload.distance_cm);

  if (!sensor_id) throw new Error("sensor_id_required");
  if (distance_cm === null) throw new Error("distance_cm_required");

  const client = await pool.connect();

  try {
    // Измерение и тревога создаются в одной транзакции, чтобы БД не осталась
    // в половинчатом состоянии при ошибке.
    await client.query("BEGIN");

    // Сначала ищем активный датчик и связанный гидропост, потому что пороги,
    // высота установки и название поста хранятся именно в monitoring_stations.
    const station_result = await client.query(
      `SELECT
         sn.sensor_id,
         sn.name AS sensor_name,
         ms.id AS monitoring_station_id,
         ms.name AS monitoring_station_name,
         ms.station_code,
         ms.sensor_height_cm,
         ms.sensor_angle_deg,
         ms.danger_level_cm,
         ms.critical_level_cm,
         wb.name AS water_body_name
       FROM sensors sn
       JOIN monitoring_stations ms ON ms.id = sn.monitoring_station_id
       JOIN water_bodies wb ON wb.id = ms.water_body_id
       WHERE sn.sensor_id = $1
         AND sn.is_active = true
         AND ms.is_active = true
       LIMIT 1`,
      [sensor_id]
    );

    if (station_result.rows.length === 0) {
      throw new Error("sensor_not_found");
    }

    const station = station_result.rows[0];
    const water_level_cm = calculate_water_level(
      distance_cm,
      station.sensor_height_cm,
      station.sensor_angle_deg
    );

    const measured_at = payload.measured_at ? new Date(payload.measured_at) : new Date();

    // Сохраняем исходное расстояние и расчетный уровень воды: это помогает
    // отлаживать датчики и при необходимости пересчитать модель.
    const result = await client.query(
      `INSERT INTO water_level_measurements (
         sensor_id,
         packet_id,
         distance_cm,
         water_level_cm,
         hop_count,
         rssi,
         snr,
         measured_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        sensor_id,
        payload.packet_id || null,
        distance_cm,
        water_level_cm,
        payload.hop_count === undefined ? null : Number(payload.hop_count),
        payload.rssi === undefined ? null : Number(payload.rssi),
        payload.snr === undefined ? null : Number(payload.snr),
        measured_at,
      ]
    );

    // После вставки сразу обновляем тревоги и ставим уведомление в очередь.
    const measurement = result.rows[0];
    const status = get_status(water_level_cm, station.danger_level_cm, station.critical_level_cm);
    const alert = await create_alert_if_needed(client, station, measurement, status);

    await client.query("COMMIT");
    if (alert) {
      queue_alert_notification({ alert, station, measurement });
    }
    return { ...measurement, water_level_status: status, alert };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function send_measurement_error(res, error) {
  const known_errors = ["sensor_id_required", "distance_cm_required", "sensor_not_found", "invalid_distance_cm"];
  res.status(known_errors.includes(error.message) ? 400 : 500).json({ error: error.message || "database_error" });
}

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT now() AS database_time");
    res.json({
      ok: true,
      database: describe_database_config(database_config),
      database_time: result.rows[0].database_time,
    });
  } catch (error) {
    const database_error = explain_database_error(error);
    console.error("Database health check failed:", database_error);
    res.status(500).json({
      ok: false,
      error: "database_error",
      database: describe_database_config(database_config),
      database_error,
    });
  }
});

// Авторизация: пользователь получает подписанный токен, который frontend кладет
// в localStorage и отправляет в Authorization: Bearer ...
app.post("/api/auth/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({ error: "username_and_password_required" });
    }

    const result = await pool.query(
      "SELECT id, username, password_hash, role FROM users WHERE username = $1 LIMIT 1",
      [username]
    );

    if (result.rows.length === 0 || !(await verify_password(password, result.rows[0].password_hash))) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const user = public_user(result.rows[0]);
    const token = sign_token({
      id: user.id,
      username: user.username,
      role: user.role,
      expires_at: Date.now() + TOKEN_TTL_MS,
    });

    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "auth_error" });
  }
});

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: public_user(req.user) });
});

// Универсальные CRUD-ручки админки. Они опираются на TABLE_DEFINITIONS,
// поэтому frontend может работать с несколькими таблицами одним компонентом.
app.get("/api/db/tables", authenticate, (req, res) => {
  res.json(
    Object.entries(TABLE_DEFINITIONS).map(([name, definition]) => ({
      name,
      primary_key: definition.primary_key,
      columns: definition.columns,
    }))
  );
});

app.get("/api/db/:table", authenticate, async (req, res) => {
  try {
    const table_name = req.params.table;
    const definition = get_table_definition(table_name);
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);

    const result = await pool.query(
      `SELECT *
       FROM ${table_name}
       ORDER BY ${definition.primary_key} DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      table: table_name,
      primary_key: definition.primary_key,
      columns: definition.columns,
      rows: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error: error.message || "database_error" });
  }
});

app.post("/api/db/:table", authenticate, require_admin, async (req, res) => {
  try {
    const table_name = req.params.table;
    const definition = get_table_definition(table_name);
    const payload = build_payload(req.body, definition);
    const entries = Object.entries(payload);

    if (entries.length === 0) {
      return res.status(400).json({ error: "empty_payload" });
    }

    const columns = entries.map(([name]) => name);
    const values = entries.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 1}`);

    const result = await pool.query(
      `INSERT INTO ${table_name} (${columns.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      values
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || "database_error" });
  }
});

app.put("/api/db/:table/:id", authenticate, require_admin, async (req, res) => {
  try {
    const table_name = req.params.table;
    const definition = get_table_definition(table_name);
    const payload = build_payload(req.body, definition, { include_insert_only: false });
    const entries = Object.entries(payload);

    if (entries.length === 0) {
      return res.status(400).json({ error: "empty_payload" });
    }

    const values = entries.map(([, value]) => value);
    values.push(req.params.id);

    const set_clause = entries
      .map(([name], index) => `${name} = $${index + 1}`)
      .join(", ");

    const result = await pool.query(
      `UPDATE ${table_name}
       SET ${set_clause}
       WHERE ${definition.primary_key} = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "row_not_found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || "database_error" });
  }
});

app.delete("/api/db/:table/:id", authenticate, require_admin, async (req, res) => {
  try {
    const table_name = req.params.table;
    const definition = get_table_definition(table_name);
    const result = await pool.query(
      `DELETE FROM ${table_name}
       WHERE ${definition.primary_key} = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "row_not_found" });
    }

    res.json({ deleted: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || "database_error" });
  }
});

// Создание гидропоста вместе с датчиком — удобная транзакционная ручка,
// чтобы не делать две отдельные операции в интерфейсе администратора.
app.post("/api/admin/monitoring_stations_with_sensor", authenticate, require_admin, async (req, res) => {
  const client = await pool.connect();

  try {
    const station_payload = build_payload(req.body, TABLE_DEFINITIONS.monitoring_stations);
    const sensor_id = String(req.body.sensor_id || "").trim();

    if (!sensor_id) {
      return res.status(400).json({ error: "sensor_id_required" });
    }

    await client.query("BEGIN");

    const station_entries = Object.entries(station_payload);
    const station_columns = station_entries.map(([name]) => name);
    const station_values = station_entries.map(([, value]) => value);
    const station_placeholders = station_values.map((_, index) => `$${index + 1}`);

    const station_result = await client.query(
      `INSERT INTO monitoring_stations (${station_columns.join(", ")})
       VALUES (${station_placeholders.join(", ")})
       RETURNING *`,
      station_values
    );

    const station = station_result.rows[0];

    const sensor_result = await client.query(
      `INSERT INTO sensors (sensor_id, monitoring_station_id, name, sensor_type, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [
        sensor_id,
        station.id,
        req.body.sensor_name || `HC-SR04/LoRa ${sensor_id}`,
        req.body.sensor_type || "ultrasonic",
      ]
    );

    await client.query("COMMIT");
    res.status(201).json({ station, sensor: sensor_result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(400).json({ error: error.message || "database_error" });
  } finally {
    client.release();
  }
});

// Главная сводка для дашборда и карты: по каждому активному гидропосту
// возвращается последний замер и рассчитанный статус уровня воды.
app.get("/api/monitoring_stations/latest", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (ms.id)
          ms.id AS monitoring_station_id,
          ms.name AS monitoring_station_name,
          ms.station_code,
          ms.latitude,
          ms.longitude,
          ms.sensor_height_cm,
          ms.sensor_angle_deg,

          wb.id AS water_body_id,
          wb.name AS water_body_name,
          wb.water_body_type,
          wb.basin,

          st.id AS settlement_id,
          st.name AS settlement_name,
          st.region,
          st.district,

          sn.sensor_id,
          sn.name AS sensor_name,

          wlm.distance_cm,
          wlm.water_level_cm,
          wlm.measured_at,
          wlm.received_at,

          ms.danger_level_cm,
          ms.critical_level_cm,

          CASE
              WHEN wlm.water_level_cm IS NULL THEN 'no_data'
              WHEN ms.critical_level_cm IS NOT NULL
                   AND wlm.water_level_cm >= ms.critical_level_cm
                  THEN 'critical'
              WHEN ms.danger_level_cm IS NOT NULL
                   AND wlm.water_level_cm >= ms.danger_level_cm
                  THEN 'danger'
              ELSE 'normal'
          END AS water_level_status

      FROM monitoring_stations ms
      JOIN water_bodies wb ON wb.id = ms.water_body_id
      LEFT JOIN settlements st ON st.id = ms.settlement_id
      LEFT JOIN sensors sn ON sn.monitoring_station_id = ms.id AND sn.is_active = true
      LEFT JOIN water_level_measurements wlm ON wlm.sensor_id = sn.sensor_id
      WHERE ms.is_active = true
      ORDER BY ms.id, wlm.measured_at DESC NULLS LAST;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "database_error" });
  }
});

app.get("/api/monitoring_stations", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ms.*,
        wb.name AS water_body_name,
        wb.water_body_type,
        st.name AS settlement_name,
        st.region,
        st.district
      FROM monitoring_stations ms
      JOIN water_bodies wb ON wb.id = ms.water_body_id
      LEFT JOIN settlements st ON st.id = ms.settlement_id
      ORDER BY ms.id;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "database_error" });
  }
});

app.get("/api/water_level_measurements/:sensor_id", async (req, res) => {
  try {
    const { sensor_id } = req.params;
    const hours = Math.min(Math.max(Number(req.query.hours || 24), 1), 720);
    const requested_limit = Number(req.query.limit);
    const limit = Number.isFinite(requested_limit)
      ? Math.min(Math.max(Math.floor(requested_limit), 1), 500)
      : null;

    const base_select = `
      SELECT
          wlm.id,
          wlm.sensor_id,
          wlm.packet_id,
          wlm.distance_cm,
          wlm.water_level_cm,
          wlm.hop_count,
          wlm.rssi,
          wlm.snr,
          wlm.measured_at,
          wlm.received_at,
          ms.danger_level_cm,
          ms.critical_level_cm
       FROM water_level_measurements wlm
       JOIN sensors sn ON sn.sensor_id = wlm.sensor_id
       JOIN monitoring_stations ms ON ms.id = sn.monitoring_station_id
       WHERE wlm.sensor_id = $1`;

    const result = limit
      ? await pool.query(
          `SELECT *
           FROM (
             ${base_select}
             ORDER BY wlm.measured_at DESC
             LIMIT $2
           ) latest_measurements
           ORDER BY measured_at ASC;`,
          [sensor_id, limit]
        )
      : await pool.query(
          `${base_select}
           AND wlm.measured_at >= now() - ($2 || ' hours')::interval
           ORDER BY wlm.measured_at ASC;`,
          [sensor_id, hours]
        );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "database_error" });
  }
});

app.get("/api/sensors", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
          sn.sensor_id,
          sn.name AS sensor_name,
          sn.sensor_type,
          sn.is_active,
          ms.id AS monitoring_station_id,
          ms.name AS monitoring_station_name,
          ms.station_code,
          wb.name AS water_body_name,
          wb.water_body_type,
          st.name AS settlement_name
      FROM sensors sn
      JOIN monitoring_stations ms ON ms.id = sn.monitoring_station_id
      JOIN water_bodies wb ON wb.id = ms.water_body_id
      LEFT JOIN settlements st ON st.id = ms.settlement_id
      ORDER BY sn.sensor_id;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "database_error" });
  }
});

app.get("/api/alerts", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const result = await pool.query(
      `SELECT
         a.*,
         ms.name AS monitoring_station_name,
         ms.station_code,
         wb.name AS water_body_name,
         wlm.water_level_cm,
         wlm.measured_at
       FROM alerts a
       JOIN monitoring_stations ms ON ms.id = a.monitoring_station_id
       JOIN water_bodies wb ON wb.id = ms.water_body_id
       LEFT JOIN water_level_measurements wlm ON wlm.id = a.measurement_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "database_error" });
  }
});

app.post("/api/admin/measurements", authenticate, require_admin, async (req, res) => {
  try {
    const measurement = await insert_measurement(req.body);
    res.status(201).json(measurement);
  } catch (error) {
    console.error(error);
    send_measurement_error(res, error);
  }
});

// Аппаратная ручка остается открытой для датчика/шлюза. Ручной ввод из интерфейса идет через /api/admin/measurements.
app.post("/api/measurements", async (req, res) => {
  try {
    const measurement = await insert_measurement(req.body);
    res.status(201).json(measurement);
  } catch (error) {
    console.error(error);
    send_measurement_error(res, error);
  }
});

// Тестовая ручка для демонстрации без Arduino: генерирует следующий замер
// рядом с предыдущим уровнем и пропускает его через ту же insert_measurement.
app.post("/api/demo/measurements", authenticate, require_admin, async (req, res) => {
  try {
    const requested_sensor_id = req.body.sensor_id;

    const sensor_result = await pool.query(
      `SELECT
         sn.sensor_id,
         ms.sensor_height_cm,
         ms.danger_level_cm,
         ms.critical_level_cm,
         last_value.water_level_cm AS last_water_level_cm
       FROM sensors sn
       JOIN monitoring_stations ms ON ms.id = sn.monitoring_station_id
       LEFT JOIN LATERAL (
         SELECT water_level_cm
         FROM water_level_measurements wlm
         WHERE wlm.sensor_id = sn.sensor_id
         ORDER BY measured_at DESC
         LIMIT 1
       ) last_value ON true
       WHERE ($1::text IS NULL OR sn.sensor_id = $1::text)
       ORDER BY sn.sensor_id
       LIMIT 1`,
      [requested_sensor_id || null]
    );

    if (sensor_result.rows.length === 0) {
      return res.status(400).json({ error: "sensor_not_found" });
    }

    const sensor = sensor_result.rows[0];
    const height = Number(sensor.sensor_height_cm || 400);
    const base_level = Number(sensor.last_water_level_cm || sensor.danger_level_cm || 120);
    const change = Math.round(Math.random() * 24 - 7);
    const next_level = Math.max(0, base_level + change);
    const distance_cm = Math.max(0, height - next_level);

    const measurement = await insert_measurement({
      sensor_id: sensor.sensor_id,
      packet_id: Date.now(),
      distance_cm,
      hop_count: Math.floor(Math.random() * 3),
      rssi: -90 + Math.floor(Math.random() * 25),
      snr: Math.floor(Math.random() * 12),
    });

    res.status(201).json(measurement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "database_error" });
  }
});

// Прогнозная ручка берет последние N замеров датчика, строит модель
// build_forecast_response и отдает frontend готовые точки для графика.
app.get("/api/forecast/:sensor_id", async (req, res) => {
  try {
    const { sensor_id } = req.params;
    const model_limit = clamp_integer(req.query.model_limit || req.query.limit, 120, 6, 300);
    const history_limit = clamp_integer(req.query.history_limit, 24, 3, 80);
    const horizon_hours = clamp_integer(req.query.horizon_hours, 12, 3, 24);
    const forecast_step_hours = clamp_float(req.query.forecast_step_hours, 1, 0.5, 6);

    const station_result = await pool.query(
      `SELECT
         sn.sensor_id,
         ms.name AS monitoring_station_name,
         ms.critical_level_cm,
         ms.danger_level_cm
       FROM sensors sn
       JOIN monitoring_stations ms ON ms.id = sn.monitoring_station_id
       WHERE sn.sensor_id = $1
       LIMIT 1`,
      [sensor_id]
    );

    if (station_result.rows.length === 0) {
      return res.status(404).json({ error: "sensor_not_found" });
    }

    const station = station_result.rows[0];

    const data_result = await pool.query(
      `SELECT *
       FROM (
         SELECT water_level_cm, measured_at
         FROM water_level_measurements
         WHERE sensor_id = $1
           AND water_level_cm IS NOT NULL
         ORDER BY measured_at DESC
         LIMIT $2
       ) latest_measurements
       ORDER BY measured_at ASC`,
      [sensor_id, model_limit]
    );

    res.json(
      build_forecast_response(sensor_id, station, data_result.rows, {
        history_limit,
        horizon_hours,
        forecast_step_hours,
      })
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "database_error" });
  }
});

// При старте сначала гарантируем таблицу пользователей, затем запускаем HTTP API
// и Telegram polling. Если БД недоступна, сервер не стартует молча.
const port = Number(process.env.PORT || 3001);
ensure_auth_schema()
  .then(() => {
    app.listen(port, () => {
      console.log(`HydroPulse API is running on port ${port}`);
      console.log("PostgreSQL config:", describe_database_config(database_config));
      start_telegram_bot({ pool });
    });
  })
  .catch((error) => {
    console.error("Failed to initialize API:", error);
    process.exit(1);
  });
