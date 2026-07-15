// Сервис фоновых уведомлений. Сейчас проект отправляет тревоги только в Telegram.
const { append_data_disclaimer } = require("./dataDisclaimer");

function parse_boolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function status_label(status) {
  const labels = {
    danger: "Опасный уровень",
    critical: "Критический уровень",
  };
  return labels[status] || "Оповещение";
}

// Форматируем сантиметры для сообщений оператору.
function format_cm(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)} см` : "нет данных";
}

// Все даты в уведомлениях показываем в русской локали, чтобы Telegram-сообщения
// были понятны без дополнительной обработки на клиенте.
function format_date(value) {
  if (!value) return "нет времени";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "нет времени" : date.toLocaleString("ru-RU");
}

// Собираем один человекочитаемый текст тревоги из данных тревоги, гидропоста и замера.
function build_alert_text({ alert, station, measurement }) {
  const station_name =
    station.monitoring_station_name ||
    station.name ||
    `Гидропост #${alert.monitoring_station_id}`;
  const water_body = station.water_body_name ? `\nВодоем: ${station.water_body_name}` : "";
  const station_code = station.station_code ? `\nКод поста: ${station.station_code}` : "";
  const sensor_id = station.sensor_id ? `\nДатчик: ${station.sensor_id}` : "";
  const level = measurement && measurement.water_level_cm !== undefined
    ? measurement.water_level_cm
    : alert.water_level_cm;

  return append_data_disclaimer([
    `HydroPulse: ${status_label(alert.alert_type)}`,
    `Пост: ${station_name}`,
    `Уровень воды: ${format_cm(level)}`,
    `Сообщение: ${alert.message}`,
    `Время: ${format_date(alert.created_at || (measurement && measurement.measured_at))}`,
    station_code,
    sensor_id,
    water_body,
  ]
    .filter(Boolean)
    .join("\n"));
}

// Низкоуровневая отправка одного Telegram-сообщения через Bot API.
async function send_telegram_message(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat_id = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHANNEL_ID;

  if (!token || !chat_id) {
    return { skipped: true, channel: "telegram", reason: "telegram_not_configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.NOTIFICATION_TIMEOUT_MS || 10000));

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        text,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.description || `telegram_http_${response.status}`);
    }

    return { sent: true, channel: "telegram" };
  } finally {
    clearTimeout(timeout);
  }
}

// Публичная функция для немедленной отправки уведомления. Возвращает массив
// результатов, чтобы вызывающий код мог залогировать ошибки доставки.
async function send_alert_notification(context) {
  if (!context || !context.alert) {
    return [{ skipped: true, reason: "empty_alert" }];
  }

  const text = build_alert_text(context);
  const results = await Promise.allSettled([send_telegram_message(text)]);

  return results.map((result) => {
    if (result.status === "fulfilled") return result.value;
    return { sent: false, error: result.reason.message || String(result.reason) };
  });
}

// Очередь нужна, чтобы HTTP-запрос записи замера не ждал Telegram.
// Если уведомление упадет, измерение и тревога уже останутся сохраненными в БД.
function queue_alert_notification(context) {
  if (!parse_boolean(process.env.NOTIFICATIONS_ENABLED, true)) return;

  setImmediate(() => {
    send_alert_notification(context)
      .then((results) => {
        const failures = results.filter((item) => item && item.error);
        failures.forEach((failure) => {
          console.error("Alert notification failed:", failure.error);
        });
      })
      .catch((error) => {
        console.error("Alert notification failed:", error.message || error);
      });
  });
}

module.exports = {
  queue_alert_notification,
  send_alert_notification,
};
