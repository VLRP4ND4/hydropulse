// Telegram-бот работает через long polling: backend сам опрашивает Telegram
// методом getUpdates и отвечает на команды операторов.
const { append_data_disclaimer } = require("./dataDisclaimer");

function parse_boolean(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

// Переменная TELEGRAM_ALLOWED_CHAT_IDS хранится как строка "id1,id2,id3",
// поэтому перед проверкой ее нужно разрезать на массив.
function split_list(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// Единый формат чисел в сообщениях бота.
function format_cm(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)} см` : "—";
}

function format_date(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

function status_label(status) {
  const labels = {
    critical: "критично",
    danger: "опасно",
    normal: "норма",
    no_data: "нет данных",
  };
  return labels[status] || status || "нет данных";
}

function get_status(water_level_cm, danger_level_cm, critical_level_cm) {
  if (water_level_cm === null || water_level_cm === undefined) return "no_data";
  if (critical_level_cm !== null && critical_level_cm !== undefined && Number(water_level_cm) >= Number(critical_level_cm)) {
    return "critical";
  }
  if (danger_level_cm !== null && danger_level_cm !== undefined && Number(water_level_cm) >= Number(danger_level_cm)) {
    return "danger";
  }
  return "normal";
}

// Команды могут приходить как /status или /status@BotName, поэтому суффикс
// имени бота убирается, а аргументы возвращаются отдельным массивом.
function normalize_command(text) {
  const [command = "", ...args] = String(text || "").trim().split(/\s+/);
  return {
    command: command.replace(/@\w+$/u, "").toLowerCase(),
    args,
  };
}

// Если список разрешенных чатов пустой, бот открыт для всех, кто ему пишет.
// Если список заполнен, команды выполняются только из указанных chat_id.
function is_chat_allowed(chat_id) {
  const allowed = split_list(process.env.TELEGRAM_ALLOWED_CHAT_IDS);

  if (allowed.length === 0) return true;

  return allowed.includes(String(chat_id));
}

// Универсальная обертка над Telegram Bot API: отправляет POST-запрос
// и превращает ошибку Telegram в обычный Error.
async function telegram_call(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.ok === false) {
    throw new Error(body.description || `telegram_${method}_${response.status}`);
  }

  return body.result;
}

async function send_message(token, chat_id, text) {
  return telegram_call(token, "sendMessage", {
    chat_id,
    text,
    disable_web_page_preview: true,
  });
}

// getUpdates забирает новые сообщения и channel_post. offset нужен, чтобы
// после обработки Telegram больше не отдавал те же самые update повторно.
async function fetch_updates(token, offset) {
  const params = new URLSearchParams({
    timeout: "25",
    allowed_updates: JSON.stringify(["message", "channel_post"]),
  });

  if (offset) params.set("offset", String(offset));

  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?${params.toString()}`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.ok === false) {
    throw new Error(body.description || `telegram_getUpdates_${response.status}`);
  }

  return body.result || [];
}

// /status собирает три независимых SQL-запроса параллельно: счетчики постов,
// активные тревоги и последний замер по системе.
async function build_status_message(pool) {
  const [stations_result, alerts_result, latest_result] = await Promise.all([
    pool.query(`
      SELECT
        count(DISTINCT ms.id)::int AS stations_total,
        count(DISTINCT ms.id) FILTER (WHERE ms.is_active = true)::int AS stations_active,
        count(DISTINCT sn.sensor_id) FILTER (WHERE sn.is_active = true)::int AS sensors_active
      FROM monitoring_stations ms
      LEFT JOIN sensors sn ON sn.monitoring_station_id = ms.id
    `),
    pool.query(`
      SELECT alert_type, count(*)::int AS total
      FROM alerts
      WHERE resolved_at IS NULL
      GROUP BY alert_type
    `),
    pool.query(`
      SELECT
        ms.name AS monitoring_station_name,
        wb.name AS water_body_name,
        sn.sensor_id,
        wlm.water_level_cm,
        wlm.measured_at,
        ms.danger_level_cm,
        ms.critical_level_cm
      FROM monitoring_stations ms
      JOIN water_bodies wb ON wb.id = ms.water_body_id
      LEFT JOIN sensors sn ON sn.monitoring_station_id = ms.id AND sn.is_active = true
      LEFT JOIN LATERAL (
        SELECT water_level_cm, measured_at
        FROM water_level_measurements
        WHERE sensor_id = sn.sensor_id
        ORDER BY measured_at DESC
        LIMIT 1
      ) wlm ON true
      WHERE ms.is_active = true
      ORDER BY wlm.measured_at DESC NULLS LAST, ms.id
      LIMIT 1
    `),
  ]);

  const station_info = stations_result.rows[0] || {};
  const alert_counts = alerts_result.rows.reduce((acc, row) => {
    acc[row.alert_type] = row.total;
    return acc;
  }, {});
  const active_alerts = Object.values(alert_counts).reduce((sum, value) => sum + value, 0);
  const latest = latest_result.rows[0];
  const latest_status = latest
    ? get_status(latest.water_level_cm, latest.danger_level_cm, latest.critical_level_cm)
    : "no_data";

  return [
    "HydroPulse: состояние системы",
    `Гидропостов: ${station_info.stations_active || 0}/${station_info.stations_total || 0}`,
    `Активных датчиков: ${station_info.sensors_active || 0}`,
    `Активных тревог: ${active_alerts}`,
    `Критичных: ${alert_counts.critical || 0}, опасных: ${alert_counts.danger || 0}`,
    latest
      ? `Последний замер: ${latest.monitoring_station_name}, ${format_cm(latest.water_level_cm)}, ${status_label(latest_status)}, ${format_date(latest.measured_at)}`
      : "Последний замер: нет данных",
  ].join("\n");
}

// /alerts показывает последние активные тревоги, то есть записи без resolved_at.
async function build_alerts_message(pool) {
  const result = await pool.query(`
    SELECT
      a.alert_type,
      a.message,
      a.created_at,
      ms.name AS monitoring_station_name,
      wb.name AS water_body_name,
      wlm.water_level_cm
    FROM alerts a
    JOIN monitoring_stations ms ON ms.id = a.monitoring_station_id
    JOIN water_bodies wb ON wb.id = ms.water_body_id
    LEFT JOIN water_level_measurements wlm ON wlm.id = a.measurement_id
    WHERE a.resolved_at IS NULL
    ORDER BY a.created_at DESC
    LIMIT 5
  `);

  if (result.rows.length === 0) return "Активных тревог нет.";

  return [
    "Активные тревоги:",
    ...result.rows.map((alert, index) => (
      `${index + 1}. ${status_label(alert.alert_type)}: ${alert.monitoring_station_name}\n` +
      `   ${alert.message}; ${format_cm(alert.water_level_cm)}; ${format_date(alert.created_at)}`
    )),
  ].join("\n");
}

// /stations сортирует гидропосты по риску: сначала критические, затем опасные,
// затем нормальные и посты без данных.
async function build_stations_message(pool) {
  const result = await pool.query(`
    SELECT
      ms.name AS monitoring_station_name,
      ms.station_code,
      wb.name AS water_body_name,
      sn.sensor_id,
      wlm.water_level_cm,
      wlm.measured_at,
      ms.danger_level_cm,
      ms.critical_level_cm
    FROM monitoring_stations ms
    JOIN water_bodies wb ON wb.id = ms.water_body_id
    LEFT JOIN sensors sn ON sn.monitoring_station_id = ms.id AND sn.is_active = true
    LEFT JOIN LATERAL (
      SELECT water_level_cm, measured_at
      FROM water_level_measurements
      WHERE sensor_id = sn.sensor_id
      ORDER BY measured_at DESC
      LIMIT 1
    ) wlm ON true
    WHERE ms.is_active = true
    ORDER BY
      CASE
        WHEN wlm.water_level_cm >= ms.critical_level_cm THEN 1
        WHEN wlm.water_level_cm >= ms.danger_level_cm THEN 2
        WHEN wlm.water_level_cm IS NULL THEN 4
        ELSE 3
      END,
      ms.id
    LIMIT 8
  `);

  if (result.rows.length === 0) return "Гидропостов пока нет.";

  return [
    "Гидропосты:",
    ...result.rows.map((station, index) => {
      const status = get_status(station.water_level_cm, station.danger_level_cm, station.critical_level_cm);
      return `${index + 1}. ${station.monitoring_station_name} (${station.sensor_id || station.station_code || "без датчика"}) — ${format_cm(station.water_level_cm)}, ${status_label(status)}`;
    }),
  ].join("\n");
}

// /post ищет один гидропост по sensor_id, коду станции или части названия.
async function build_post_message(pool, query) {
  if (!query) return "Укажи sensor_id, код или название: /post 001";

  const result = await pool.query(
    `
      SELECT
        ms.name AS monitoring_station_name,
        ms.station_code,
        wb.name AS water_body_name,
        sn.sensor_id,
        wlm.water_level_cm,
        wlm.measured_at,
        ms.danger_level_cm,
        ms.critical_level_cm,
        ms.latitude,
        ms.longitude
      FROM monitoring_stations ms
      JOIN water_bodies wb ON wb.id = ms.water_body_id
      LEFT JOIN sensors sn ON sn.monitoring_station_id = ms.id AND sn.is_active = true
      LEFT JOIN LATERAL (
        SELECT water_level_cm, measured_at
        FROM water_level_measurements
        WHERE sensor_id = sn.sensor_id
        ORDER BY measured_at DESC
        LIMIT 1
      ) wlm ON true
      WHERE sn.sensor_id = $1
         OR ms.station_code = $1
         OR lower(ms.name) LIKE lower($2)
      ORDER BY ms.id
      LIMIT 1
    `,
    [query, `%${query}%`]
  );

  const station = result.rows[0];
  if (!station) return `Гидропост не найден: ${query}`;

  const status = get_status(station.water_level_cm, station.danger_level_cm, station.critical_level_cm);

  return [
    station.monitoring_station_name,
    `Датчик: ${station.sensor_id || "—"}`,
    `Река: ${station.water_body_name || "—"}`,
    `Уровень: ${format_cm(station.water_level_cm)}`,
    `Статус: ${status_label(status)}`,
    `Опасный: ${format_cm(station.danger_level_cm)}`,
    `Критический: ${format_cm(station.critical_level_cm)}`,
    `Время: ${format_date(station.measured_at)}`,
    `Координаты: ${station.latitude || "—"}, ${station.longitude || "—"}`,
  ].join("\n");
}

// Справка намеренно короткая: команды должны помещаться в одно сообщение.
function help_message() {
  return append_data_disclaimer([
    "HydroPulse bot",
    "",
    "/status — состояние системы",
    "/alerts — активные тревоги",
    "/stations — список гидропостов",
    "/post 001 — гидропост по sensor_id, коду или названию",
    "/id — показать chat_id для настройки канала",
    "/help — список команд",
  ].join("\n"));
}

// Центральный обработчик одного update: проверяет доступ, выбирает команду
// и отправляет результат обратно в тот же чат.
async function handle_update(pool, token, update) {
  const message = update.message || update.channel_post;
  if (!message || !message.text || !message.chat) return;

  const chat_id = message.chat.id;
  const { command, args } = normalize_command(message.text);

  if (!is_chat_allowed(chat_id)) {
    await send_message(token, chat_id, "Этот чат не добавлен в TELEGRAM_ALLOWED_CHAT_IDS.");
    return;
  }

  let response;

  switch (command) {
    case "/start":
    case "/help":
      response = help_message();
      break;
    case "/id":
      response = [
        `Chat ID: ${chat_id}`,
        `Тип: ${message.chat.type}`,
        message.chat.title ? `Название: ${message.chat.title}` : "",
      ].filter(Boolean).join("\n");
      break;
    case "/status":
      response = append_data_disclaimer(await build_status_message(pool));
      break;
    case "/alerts":
      response = append_data_disclaimer(await build_alerts_message(pool));
      break;
    case "/stations":
      response = append_data_disclaimer(await build_stations_message(pool));
      break;
    case "/post":
      response = append_data_disclaimer(await build_post_message(pool, args.join(" ")));
      break;
    default:
      if (!command.startsWith("/")) return;
      response = "Неизвестная команда. Напиши /help.";
  }

  await send_message(token, chat_id, response);
}

// Запуск polling-цикла. Функция возвращает stop-callback, хотя в текущем server.js
// он не используется: это оставлено для тестов или будущего graceful shutdown.
function start_telegram_bot({ pool }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log("Telegram bot is disabled: TELEGRAM_BOT_TOKEN is not set.");
    return;
  }

  if (!parse_boolean(process.env.TELEGRAM_BOT_POLLING, true)) {
    console.log("Telegram bot polling is disabled by TELEGRAM_BOT_POLLING=false.");
    return;
  }

  let offset = 0;
  let stopped = false;

  async function poll_loop() {
    while (!stopped) {
      try {
        const updates = await fetch_updates(token, offset);

        for (const update of updates) {
          offset = update.update_id + 1;
          await handle_update(pool, token, update);
        }
      } catch (error) {
        console.error("Telegram bot polling failed:", error.message || error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  poll_loop();
  console.log("Telegram bot polling started.");

  return () => {
    stopped = true;
  };
}

module.exports = {
  start_telegram_bot,
};
