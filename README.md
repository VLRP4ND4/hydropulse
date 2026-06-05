# HydroPulse

HydroPulse — система мониторинга уровня воды для гидропостов. Проект связывает Arduino/LoRa-узлы, PostgreSQL, Express API, React-интерфейс и Telegram-бота. Датчики отправляют расстояние до воды, backend пересчитывает его в уровень воды, сохраняет историю, создает тревоги и строит краткосрочный прогноз паводкового риска.

## Что Реализовано

- Arduino/LoRa-контур: датчик, ретранслятор и базовая станция.
- Импорт аппаратных данных из COM-порта в PostgreSQL.
- Express API для дашборда, карты, графиков, прогноза, тревог и админки.
- PostgreSQL-схема с гидропостами, датчиками, измерениями и тревогами.
- React-приложение с главной страницей, картой, графиками, прогнозом и CRUD-админкой.
- Telegram-бот с командами `/status`, `/alerts`, `/stations`, `/post`, `/id`, `/help`.
- Тестовый ввод замеров без Arduino через web-форму и API.

## Структура Проекта

```text
apps/api
  server.js                 основной Express API
  db.js                     подключение и диагностика PostgreSQL
  serial_to_postgres.js     импорт строк DATA из COM-порта
  telegramBot.js            команды Telegram-бота
  notificationService.js    фоновые Telegram-уведомления о тревогах

apps/web
  src/api                   клиентские функции обращения к backend API
  src/pages                 страницы: главная, карта, графики, прогноз, админка, вход
  src/components            таблицы, карта, графики, виджеты, формы
  src/context               тема и авторизация

arduino_code/FULL
  SENDER                    узел-датчик: ультразвук + LoRa
  RELAY                     ретранслятор LoRa
  BASE_STATION              приемник LoRa, печатает DATA-строки в Serial

database
  ALL_TABLES.sql            схема БД и демо-данные
  *.backup                  резервные копии PostgreSQL
```

Папка `arduino_code/trash` содержит старые эксперименты и тестовые скетчи. Рабочий контур находится в `arduino_code/FULL`.

## Поток Данных

```mermaid
flowchart LR
  A["SENDER: ультразвуковой датчик"] --> B["LoRa пакет sensor_id;packet_id;distance_cm;hop_count"]
  B --> C["RELAY: пересылка при необходимости"]
  C --> D["BASE_STATION: прием LoRa"]
  D --> E["Serial DATA;sensor_id;packet_id;distance_cm;hop_count;rssi;snr"]
  E --> F["serial_to_postgres.js"]
  F --> G["PostgreSQL"]
  G --> H["Express API"]
  H --> I["React dashboard"]
  H --> J["Telegram bot"]
```

Если Arduino пока нет, замер можно добавить через React-форму или `POST /api/measurements`. Он пройдет через ту же backend-логику: расчет уровня воды, сохранение, проверка порогов, создание тревоги.

## База Данных

Основные таблицы:

- `water_bodies` — справочник водных объектов.
- `settlements` — населенные пункты рядом с гидропостами.
- `monitoring_stations` — гидропосты, координаты, опасный/критический пороги, высота и угол датчика.
- `sensors` — физические датчики, привязанные к гидропостам.
- `water_level_measurements` — история замеров: расстояние, рассчитанный уровень воды, RSSI/SNR, время.
- `alerts` — тревоги `danger` и `critical`, закрываются через `resolved_at`.
- `users` — создается backend-ом при старте для входа в админку.

Расчет уровня воды:

```text
water_level_cm = sensor_height_cm - distance_cm * cos(sensor_angle_deg)
```

Если высота датчика не задана, backend считает уровень равным измеренному расстоянию. В рабочей схеме высота есть у каждого гидропоста.

## Запуск PostgreSQL

Создай базу `HydroPulse`, затем выполни:

```powershell
psql -U postgres -d HydroPulse -f database/ALL_TABLES.sql
```

Через pgAdmin можно открыть `database/ALL_TABLES.sql` в Query Tool и выполнить весь файл.

## Backend

Файл настроек: `apps/api/.env`.

Минимальный набор:

```env
PORT=3001
AUTH_SECRET=change_me_for_production
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=HydroPulse
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_VIEWER_USERNAME=viewer
DEFAULT_VIEWER_PASSWORD=viewer123
SERIAL_PORT=COM8
SERIAL_BAUD_RATE=9600
NOTIFICATIONS_ENABLED=true
NOTIFICATION_TIMEOUT_MS=10000
TELEGRAM_BOT_TOKEN=токен_бота
TELEGRAM_CHAT_ID=chat_id
TELEGRAM_BOT_POLLING=true
TELEGRAM_ALLOWED_CHAT_IDS=
```

Запуск API:

```powershell
cd apps/api
npm.cmd install
npm.cmd run dev
```

Проверка:

```text
http://localhost:3001/api/health
```

Импорт данных из COM-порта:

```powershell
cd apps/api
npm.cmd run serial
```

## Frontend

Файл настроек: `apps/web/.env`.

```env
REACT_APP_API_URL=http://localhost:3001
```

Карта в текущем коде работает через Leaflet/OpenStreetMap.

Запуск:

```powershell
cd apps/web
npm.cmd install
npm.cmd start
```

Сайт:

```text
http://localhost:3000
```

## Arduino / LoRa

Рабочий комплект:

- `SENDER` измеряет расстояние ультразвуковым датчиком, фильтрует серию измерений и отправляет пакет.
- `RELAY` принимает пакет, проверяет дубликат, увеличивает `hop_count` и пересылает дальше.
- `BASE_STATION` принимает пакет, добавляет `rssi` и `snr`, печатает строку для Node.js.

Формат LoRa-пакета:

```text
sensor_id;packet_id;distance_cm;hop_count
```

Формат строки для backend:

```text
DATA;sensor_id;packet_id;distance_cm;hop_count;rssi;snr
```

Пример:

```text
DATA;001;15;230.5;1;-72;8.4
```

## API

Публичные ручки:

```text
GET  /api/health
GET  /api/monitoring_stations/latest
GET  /api/monitoring_stations
GET  /api/water_level_measurements/:sensor_id?hours=24
GET  /api/water_level_measurements/:sensor_id?limit=30
GET  /api/sensors
GET  /api/alerts?limit=20
GET  /api/forecast/:sensor_id?model_limit=120&history_limit=24&horizon_hours=12
POST /api/measurements
```

Авторизация и админка:

```text
POST   /api/auth/login
GET    /api/auth/me
POST   /api/admin/measurements
POST   /api/demo/measurements
GET    /api/db/tables
GET    /api/db/:table
POST   /api/db/:table
PUT    /api/db/:table/:id
DELETE /api/db/:table/:id
POST   /api/admin/monitoring_stations_with_sensor
```

Пример ручного замера:

```json
{
  "sensor_id": "001",
  "packet_id": 16,
  "distance_cm": 230,
  "hop_count": 1,
  "rssi": -72,
  "snr": 8
}
```

## Telegram-Бот

Бот запускается вместе с `server.js`, если задан `TELEGRAM_BOT_TOKEN`.

Команды:

```text
/status    состояние системы
/alerts    активные тревоги
/stations  список гидропостов
/post 001  гидропост по sensor_id, коду или названию
/id        показать chat_id
/help      список команд
```

Если `TELEGRAM_ALLOWED_CHAT_IDS` пустой, команды доступны всем, кто пишет боту. Если в переменной перечислить ID через запятую, бот будет отвечать только этим чатам.

## Модель Прогнозирования

Прогноз строится на backend-е в `apps/api/server.js`, функция `build_forecast_response`. Frontend не рассчитывает модель, а только получает готовый JSON от `GET /api/forecast/:sensor_id`.

Ручка специально разделяет расчет модели и отображение графика:

- `model_limit` — сколько последних замеров использовать для расчета модели, по умолчанию `120`, максимум `300`;
- `history_limit` — сколько фактических точек показать на графике, по умолчанию `24`;
- `horizon_hours` — на сколько часов вперед строить прогноз, по умолчанию `12`;
- `forecast_step_hours` — шаг прогнозных точек, по умолчанию `1` час.

Пример:

```text
GET /api/forecast/001?model_limit=120&history_limit=24&horizon_hours=12&forecast_step_hours=1
```

Это важно для интерфейса: если в базе накопится 1000 замеров, график не будет выводить 1000 фактических точек. Модель берет достаточно широкое окно последних данных для устойчивого расчета, а визуализация показывает только компактный фрагмент, который удобно читать.

### Входные Данные

Backend берет последние `model_limit` замеров датчика:

```sql
SELECT water_level_cm, measured_at
FROM water_level_measurements
WHERE sensor_id = $1
  AND water_level_cm IS NOT NULL
ORDER BY measured_at DESC
LIMIT $2
```

Затем порядок разворачивается по времени от старых к новым. Каждая точка преобразуется:

```text
x = часы от первого замера
y = water_level_cm
```

Для графика отдельно берутся последние `history_limit` строк из уже загруженного расчетного окна. Это не ухудшает модель: скорость, разброс и доверие считаются по `model_limit`, а не по укороченной визуальной выборке.

### Взвешенная Линейная Регрессия

Базовый тренд считается взвешенной линейной регрессией:

```text
y = intercept + rate * x
```

Особенность: свежие точки имеют больший вес. Вес растет примерно от `1` у старых замеров до `3` у последних. Это сделано потому, что паводковая ситуация может быстро меняться, и последние измерения важнее старой истории.

Модель возвращает:

- `intercept` — базовый уровень линии тренда.
- `rate` — скорость изменения уровня, см/ч.
- `r2` — насколько хорошо линия объясняет данные.
- `residual_std` — разброс ошибок модели.

### Скорость Последних Замеров

Отдельно строится профиль скоростей:

```text
velocity_i = (level_i - level_(i-1)) / delta_hours
```

Затем берется медиана последних четырех скоростей. Итоговая скорость смешивает два источника:

```text
rate = regression.rate * 0.65 + recent_rate * 0.35
```

Так модель не дергается от одного случайного измерения, но все равно реагирует на свежий рост воды.

### Ускорение

Ускорение оценивается как разница между средней свежей скоростью и более старой средней скоростью:

```text
acceleration = (recent_velocity - previous_velocity) / max(time_span_hours / 2, 1)
```

Значение ограничивается диапазоном от `-3` до `3` см/ч², чтобы единичный шумовой скачок не разрушил прогноз.

### Прогноз На Заданный Горизонт

Для каждого шага от `forecast_step_hours` до `horizon_hours` используется формула:

```text
forecast_level = last_level + rate * hour + 0.5 * acceleration * hour²
```

Уровень не уходит ниже нуля:

```text
forecast_level = max(0, forecast_level)
```

### Коридор Риска

Для каждого прогнозного часа считается неопределенность:

```text
uncertainty =
  residual_std
  + velocity_volatility * sqrt(hour) * 0.6
  + abs(acceleration) * hour * 0.4
```

Где:

- `residual_std` — насколько фактические данные расходятся с трендом.
- `velocity_volatility` — насколько нестабильны скорости между замерами.
- `sqrt(hour)` — неопределенность растет с горизонтом, но не линейно.
- `abs(acceleration)` — если тренд ускоряется или тормозит, риск ошибки выше.

Коридор:

```text
forecast_lower_cm = max(0, forecast_level - uncertainty)
forecast_upper_cm = forecast_level + uncertainty
```

На графике:

- фактический уровень — сплошная синяя линия;
- прогноз — пунктирная зеленая линия;
- верхний коридор риска — оранжевая линия;
- нижний коридор — серая линия;
- критический порог — красный пунктир.

По умолчанию на графике выводится до `24` фактических точек и `12` прогнозных точек. Если расчетное окно больше, например `120` замеров, оно влияет на формулы и метрики модели, но не засоряет график.

### Время До Порогов

Модель оценивает:

- `hours_to_danger` — часы до опасного уровня;
- `hours_to_critical` — часы до критического уровня;
- `risk_hours_to_critical` — часы до критического уровня по верхнему коридору риска.

Если порог пересекается между двумя прогнозными точками, время уточняется линейной интерполяцией:

```text
ratio = (threshold - previous_level) / (current_level - previous_level)
hours = previous_hours + (current_hours - previous_hours) * ratio
```

### Уверенность Прогноза

Поле `confidence` принимает значения:

- `high` — высокая;
- `medium` — средняя;
- `low` — низкая.

Оценка складывается из факторов:

- количество замеров;
- длительность истории в часах;
- качество линейной регрессии `r2`;
- остаточный разброс `residual_std`;
- волатильность скоростей.

Чем больше данных и стабильнее тренд, тем выше уверенность.

### Вывод Системы

Поле `warning` формируется по приоритетам:

1. Критический уровень уже достигнут.
2. Критический уровень вероятен в ближайшие 6 часов.
3. Есть риск критического уровня по верхнему коридору.
4. Опасный уровень вероятен в ближайшие 6 часов.
5. Уровень растет.
6. Уровень снижается.
7. Рост не зафиксирован.

### Почему Выбран Такой Метод

Для курсовой работы выбран не сложный гидрологический симулятор, а оперативная статистическая модель:

- система получает данные только от датчика уровня воды, без осадков, температуры, ледовой обстановки, притоков и карты русла;
- для таких входных данных честнее использовать тренд и скорость изменения, а не изображать физическую модель реки;
- взвешенная регрессия устойчива к отдельным шумовым замерам, но свежие точки имеют больший вес;
- скорость последних замеров помогает быстрее реагировать на внезапный подъем воды;
- коридор риска показывает неопределенность прогноза и не выдает одну линию за абсолютно точную истину;
- разделение `model_limit` и `history_limit` позволяет считать прогноз на большем количестве данных, но показывать график компактно.

Идея для защиты: модель отвечает не на вопрос "точно какой уровень будет через 12 часов", а на вопрос "есть ли устойчивый рост и насколько близко система подходит к опасному или критическому порогу". Поэтому результат сопровождается `confidence`, разбросом модели и верхним/нижним коридором риска.

### Ограничения Модели

Модель не является гидрологической физической симуляцией. Это оперативная статистическая оценка на базе последних измерений. Она подходит для раннего предупреждения и визуализации тренда, но точность зависит от:

- частоты замеров;
- качества ультразвукового датчика;
- корректной высоты и угла установки;
- отсутствия пропусков в данных;
- стабильности LoRa-связи;
- реальной динамики реки, льда, осадков и притоков, которые сейчас не входят в модель.

## Где Смотреть Код

- Расчет уровня воды: `apps/api/server.js`, `calculate_water_level`.
- Создание тревог: `apps/api/server.js`, `create_alert_if_needed`.
- Прогноз: `apps/api/server.js`, `build_forecast_response`.
- COM-импорт: `apps/api/serial_to_postgres.js`.
- Telegram-команды: `apps/api/telegramBot.js`.
- Прогнозный график: `apps/web/src/components/forecast/ForecastChart.jsx`.
- Карта: `apps/web/src/components/map/GMap.jsx`.
- Arduino-пакеты: `arduino_code/FULL`.
