const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const TOKEN_KEY = "hydropulse_auth_token";

// API-клиент React-приложения. Здесь собраны все запросы к backend,
// чтобы компоненты не дублировали fetch, заголовки авторизации и обработку ошибок.

// Достаем токен из localStorage. Проверка localStorage нужна, чтобы код не падал
// в средах без браузерного хранилища.
export function get_stored_token() {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

// Сохраняем или удаляем токен после входа/выхода пользователя.
export function set_stored_token(token) {
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Общая обертка над fetch:
// добавляет JSON-заголовки, Bearer-токен, парсит ответ и превращает HTTP-ошибки в Error.
async function request_json(path, options = {}) {
  const token = get_stored_token();
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const content_type = response.headers.get("content-type") || "";
  const payload = content_type.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = payload && payload.error ? payload.error : `request_failed_${response.status}`;
    throw new Error(message);
  }

  return payload;
}

// Последние данные по всем гидропостам для главной страницы, карты и выбора датчика.
export function get_latest_monitoring_stations() {
  return request_json("/api/monitoring_stations/latest");
}

export function get_monitoring_stations() {
  return request_json("/api/monitoring_stations");
}

// История замеров может загружаться по часам или по фиксированному количеству последних точек.
export function get_water_level_measurements(sensor_id, options = 24) {
  const params = new URLSearchParams();

  if (typeof options === "object" && options !== null) {
    if (options.limit) {
      params.set("limit", options.limit);
    } else {
      params.set("hours", options.hours || 24);
    }
  } else {
    params.set("hours", options || 24);
  }

  return request_json(`/api/water_level_measurements/${sensor_id}?${params.toString()}`);
}

export function get_sensors() {
  return request_json("/api/sensors");
}

export function get_alerts(limit = 20) {
  return request_json(`/api/alerts?limit=${limit}`);
}

// Прогноз строится backend-ом, frontend получает уже готовые точки и метрики модели.
export function get_forecast(sensor_id, options = {}) {
  const params = new URLSearchParams();
  if (typeof options === "number") {
    params.set("model_limit", options);
  } else {
    params.set("model_limit", options.model_limit || 120);
    params.set("history_limit", options.history_limit || 24);
    params.set("horizon_hours", options.horizon_hours || 12);
    params.set("forecast_step_hours", options.forecast_step_hours || 1);
  }

  return request_json(`/api/forecast/${sensor_id}?${params.toString()}`);
}

// Ручной тестовый ввод: используется формой, когда Arduino/LoRa еще не подключены.
export function create_measurement(payload) {
  return request_json("/api/measurements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function create_admin_measurement(payload) {
  return request_json("/api/admin/measurements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function create_demo_measurement(sensor_id) {
  return request_json("/api/demo/measurements", {
    method: "POST",
    body: JSON.stringify({ sensor_id }),
  });
}

export function get_health() {
  return request_json("/api/health");
}

export function login(username, password) {
  return request_json("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function get_current_user() {
  return request_json("/api/auth/me");
}

// Универсальные CRUD-запросы для страницы администрирования базы данных.
export function get_db_tables() {
  return request_json("/api/db/tables");
}

export function get_db_table(table, limit = 100) {
  return request_json(`/api/db/${table}?limit=${limit}`);
}

export function create_db_row(table, payload) {
  return request_json(`/api/db/${table}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function update_db_row(table, id, payload) {
  return request_json(`/api/db/${table}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function delete_db_row(table, id) {
  return request_json(`/api/db/${table}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function create_monitoring_station_with_sensor(payload) {
  return request_json("/api/admin/monitoring_stations_with_sensor", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
