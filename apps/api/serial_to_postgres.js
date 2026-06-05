const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const {
  create_pool,
  database_config,
  describe_database_config,
  explain_database_error,
} = require("./db");
const { queue_alert_notification } = require("./notificationService");

// Скрипт запускается отдельно от Express API командой npm run serial.
// Его задача — читать строки из COM-порта базовой LoRa-станции и писать замеры в PostgreSQL.
const SERIAL_PORT = process.env.SERIAL_PORT || "COM8";
const BAUD_RATE = Number(process.env.SERIAL_BAUD_RATE || 9600);

// Используем общий модуль подключения к БД, чтобы настройки .env были едиными для API и COM-импорта.
const pool = create_pool();

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL client error:", explain_database_error(error));
});

function to_number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Переводим расстояние от датчика до воды в уровень воды с учетом высоты и угла установки.
function calculate_water_level(distance_cm, sensor_height_cm, sensor_angle_deg) {
  const distance = to_number(distance_cm);
  const height = to_number(sensor_height_cm);
  const angle = to_number(sensor_angle_deg) || 0;

  if (distance === null) return null;
  if (height === null) return distance;

  return Number((height - distance * Math.cos((angle * Math.PI) / 180)).toFixed(2));
}

// Полный цикл сохранения одного аппаратного пакета:
// найти датчик, рассчитать уровень, вставить замер, обновить тревоги и отправить уведомление.
async function save_measurement({ sensorId, packetId, distanceCm, hopCount, rssi, snr }) {
  // Параметры гидропоста нужны для расчета уровня и сравнения с порогами danger/critical.
  const station = await pool.query(
    `SELECT
       sn.sensor_id,
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
    [sensorId]
  );

  if (station.rows.length === 0) {
    throw new Error(`sensor_not_found: ${sensorId}`);
  }

  const info = station.rows[0];
  const waterLevelCm = calculate_water_level(distanceCm, info.sensor_height_cm, info.sensor_angle_deg);

  // В БД храним и исходное расстояние, и рассчитанный уровень воды.
  const result = await pool.query(
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
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     RETURNING *`,
    [sensorId, packetId, distanceCm, waterLevelCm, hopCount, rssi, snr]
  );

  // Статус определяется сразу после вставки, чтобы тревоги соответствовали последнему замеру.
  const status =
    info.critical_level_cm !== null && waterLevelCm >= Number(info.critical_level_cm)
      ? "critical"
      : info.danger_level_cm !== null && waterLevelCm >= Number(info.danger_level_cm)
      ? "danger"
      : "normal";

  // Нормальный уровень закрывает активные тревоги; danger/critical создают новую,
  // но только если такая активная тревога еще не существует.
  if (status === "normal") {
    await pool.query(
      `UPDATE alerts SET resolved_at = now()
       WHERE monitoring_station_id = $1 AND resolved_at IS NULL`,
      [info.monitoring_station_id]
    );
  } else {
    if (status === "critical") {
      await pool.query(
        `UPDATE alerts
         SET resolved_at = now()
         WHERE monitoring_station_id = $1
           AND alert_type = 'danger'
           AND resolved_at IS NULL`,
        [info.monitoring_station_id]
      );
    }

    const alert_result = await pool.query(
      `INSERT INTO alerts (monitoring_station_id, measurement_id, alert_type, message)
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM alerts
         WHERE monitoring_station_id = $1
           AND alert_type = $3
           AND resolved_at IS NULL
       )
       RETURNING *`,
      [
        info.monitoring_station_id,
        result.rows[0].id,
        status,
        status === "critical"
          ? `Критический уровень воды: ${waterLevelCm} см`
          : `Опасный уровень воды: ${waterLevelCm} см`,
      ]
    );

    if (alert_result.rows[0]) {
      queue_alert_notification({
        alert: alert_result.rows[0],
        station: info,
        measurement: result.rows[0],
      });
    }
  }

  return { ...result.rows[0], water_level_status: status };
}

const port = new SerialPort({
  path: SERIAL_PORT,
  baudRate: BAUD_RATE,
});

// Базовая станция печатает DATA-строки построчно, поэтому парсер режет поток по \n.
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

console.log(`Слушаю serial-порт ${SERIAL_PORT} на скорости ${BAUD_RATE} бод...`);
console.log("Ожидаемый формат: DATA;sensor_id;packet_id;distance_cm;hop_count;rssi;snr");
console.log("PostgreSQL config:", describe_database_config(database_config));

parser.on("data", async (line) => {
  const rawLine = line.trim();

  if (!rawLine) return;
  console.log("Serial:", rawLine);

  // Ожидаемый формат: DATA;sensor_id;packet_id;distance_cm;hop_count;rssi;snr
  if (!rawLine.startsWith("DATA;")) return;

  const parts = rawLine.split(";");
  if (parts.length !== 7) {
    console.log("Неверный формат DATA:", rawLine);
    return;
  }

  const [, sensorId, packetIdText, distanceText, hopText, rssiText, snrText] = parts;

  const payload = {
    sensorId,
    packetId: to_number(packetIdText),
    distanceCm: to_number(distanceText),
    hopCount: to_number(hopText),
    rssi: to_number(rssiText),
    snr: to_number(snrText),
  };

  if (!payload.sensorId || payload.distanceCm === null) {
    console.log("Неверные распознанные значения:", payload);
    return;
  }

  try {
    const inserted = await save_measurement(payload);
    console.log("Замер вставлен:", inserted);
  } catch (error) {
    console.error("Ошибка вставки в БД:", explain_database_error(error));
  }
});

port.on("open", () => {
  console.log("Serial-порт открыт");
});

port.on("error", (error) => {
  console.error("Ошибка serial-порта:", error.message);
});
