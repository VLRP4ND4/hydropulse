# HydroPulse API

Backend на Express для PostgreSQL, Telegram-бота, приема замеров и прогноза уровня воды.

## Установка

```powershell
npm.cmd install
```

Файл настроек: `.env`. Полный пример лежит в `.env.example`; укажи реальные параметры PostgreSQL, Telegram-бота и локальных учетных записей.

## База Данных

Создай базу `HydroPulse`, и потом сделай Restore из .backup в PgAdmin 4

## Запуск

```powershell
npm.cmd run dev
```

Проверка API:

```text
http://localhost:3001/api/health
```

Импорт Arduino/LoRa из COM-порта:

```powershell
npm.cmd run serial
```

## Уведомления

HydroPulse сохраняет тревоги в PostgreSQL и отправляет их в Telegram.

Укажи `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в `.env`.

Команды бота:

```text
/status   состояние системы
/alerts   активные тревоги
/stations список гидропостов
/post 001 данные поста по sensor_id, коду или названию
/id       показать chat_id для настройки
/help     список команд
```
