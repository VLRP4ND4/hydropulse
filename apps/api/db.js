const { Pool } = require("pg");
require("dotenv").config({ quiet: true });

// Приводим строковые значения окружения к boolean.
// Это нужно, например, для DATABASE_SSL=true.
function parse_boolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

// Поддерживаем два способа подключения:
// 1. DATABASE_URL — удобно для хостингов и контейнеров.
// 2. DATABASE_* — удобно для локальной разработки на PostgreSQL.
function build_database_config(env = process.env) {
  const database_url = String(env.DATABASE_URL || "").trim();

  if (database_url) {
    const config = {
      connectionString: database_url,
    };

    if (parse_boolean(env.DATABASE_SSL)) {
      config.ssl = { rejectUnauthorized: false };
    }

    return config;
  }

  return {
    host: env.DATABASE_HOST || "localhost",
    port: Number(env.DATABASE_PORT || 5432),
    database: env.DATABASE_NAME || "HydroPulse",
    user: env.DATABASE_USER || "postgres",
    password: env.DATABASE_PASSWORD || "",
  };
}

// Безопасное описание конфига для логов: пароль никогда не печатается открытым текстом.
function describe_database_config(config = build_database_config()) {
  if (config.connectionString) {
    try {
      const url = new URL(config.connectionString);
      return {
        source: "DATABASE_URL",
        host: url.hostname,
        port: url.port || 5432,
        database: url.pathname.replace(/^\//, ""),
        user: decodeURIComponent(url.username || ""),
        ssl: Boolean(config.ssl),
      };
    } catch (error) {
      return {
        source: "DATABASE_URL",
        connectionString: "<set>",
        ssl: Boolean(config.ssl),
      };
    }
  }

  return {
    source: "DATABASE_*",
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password ? "<set>" : "<empty>",
  };
}

// Переводим частые ошибки PostgreSQL в понятные подсказки для разработчика.
function explain_database_error(error) {
  const code = error.code || error.errno || "UNKNOWN";

  const hints = {
    "28P01": "PostgreSQL отклонил логин или пароль. Проверь DATABASE_USER и DATABASE_PASSWORD в apps/api/.env.",
    "3D000": "База данных не найдена. Создай ее и загрузи database/ALL_TABLES.sql или восстанови backup через pg_restore.",
    ECONNREFUSED: "PostgreSQL не принимает TCP-подключения на указанном host/port. Проверь, что служба запущена.",
    ENOTFOUND: "Хост базы данных не найден. Проверь DATABASE_HOST в apps/api/.env.",
  };

  const messages = {
    "28P01": "Неверный пользователь или пароль PostgreSQL.",
    "3D000": "Настроенная база PostgreSQL не существует.",
    ECONNREFUSED: "Не удалось подключиться к PostgreSQL host/port.",
    ENOTFOUND: "Настроенный хост PostgreSQL не найден.",
  };

  return {
    code,
    message: messages[code] || error.message || "Неизвестная ошибка PostgreSQL",
    hint: hints[code] || "Проверь настройки подключения PostgreSQL и схему базы данных.",
  };
}

const database_config = build_database_config();

// Создаем пул PostgreSQL. Пул переиспользует соединения и лучше подходит
// для API-сервера, чем создание нового Client на каждый запрос.
function create_pool() {
  return new Pool(database_config);
}

module.exports = {
  create_pool,
  database_config,
  describe_database_config,
  explain_database_error,
};
