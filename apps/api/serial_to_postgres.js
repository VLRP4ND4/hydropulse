const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const { Pool } = require("pg");
require("dotenv").config();

const SERIAL_PORT = "COM8"; // замени на свой COM-порт
const BAUD_RATE = 9600;

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

const port = new SerialPort({
  path: SERIAL_PORT,
  baudRate: BAUD_RATE,
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

console.log(`Listening serial port ${SERIAL_PORT} at ${BAUD_RATE} baud...`);

parser.on("data", async (line) => {
  const rawLine = line.trim();

  if (!rawLine) {
    return;
  }

  console.log("Serial:", rawLine);

  if (!rawLine.startsWith("DATA;")) {
    return;
  }

  const parts = rawLine.split(";");

  if (parts.length !== 7) {
    console.log("Invalid DATA format:", rawLine);
    return;
  }

  const [, sensorId, packetIdText, distanceText, hopText, rssiText, snrText] = parts;

  const packetId = Number(packetIdText);
  const distanceCm = Number(distanceText);
  const hopCount = Number(hopText);
  const rssi = Number(rssiText);
  const snr = Number(snrText);

  if (!sensorId || Number.isNaN(distanceCm)) {
    console.log("Invalid parsed values:", {
      sensorId,
      packetId,
      distanceCm,
      hopCount,
      rssi,
      snr,
    });
    return;
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO water_level_measurements (
          sensor_id,
          packet_id,
          distance_cm,
          water_level_cm,
          hop_count,
          rssi,
          snr,
          measured_at
      )
      VALUES ($1, $2, $3, NULL, $4, $5, $6, now())
      RETURNING id, sensor_id, packet_id, distance_cm, hop_count, rssi, snr, measured_at;
      `,
      [sensorId, packetId, distanceCm, hopCount, rssi, snr]
    );

    console.log("Inserted:", result.rows[0]);
  } catch (error) {
    console.error("Database insert error:", error.message);
  }
});

port.on("open", () => {
  console.log("Serial port opened");
});

port.on("error", (error) => {
  console.error("Serial port error:", error.message);
});