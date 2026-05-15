const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

app.get("/api/monitoring_stations/latest", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (ms.id)
          ms.id AS monitoring_station_id,
          ms.name AS monitoring_station_name,
          ms.station_code,

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
      JOIN water_bodies wb
          ON wb.id = ms.water_body_id
      LEFT JOIN settlements st
          ON st.id = ms.settlement_id
      JOIN sensors sn
          ON sn.monitoring_station_id = ms.id
      LEFT JOIN water_level_measurements wlm
          ON wlm.sensor_id = sn.sensor_id
      WHERE ms.is_active = true
      ORDER BY ms.id, wlm.measured_at DESC NULLS LAST;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "database_error",
    });
  }
});

app.get("/api/water_level_measurements/:sensor_id", async (req, res) => {
  try {
    const { sensor_id } = req.params;
    const hours = Number(req.query.hours || 24);

    const result = await pool.query(
      `
      SELECT
          id,
          sensor_id,
          distance_cm,
          water_level_cm,
          measured_at,
          received_at
      FROM water_level_measurements
      WHERE sensor_id = $1
        AND measured_at >= now() - ($2 || ' hours')::interval
      ORDER BY measured_at ASC;
      `,
      [sensor_id, hours]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "database_error",
    });
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
          wb.name AS water_body_name,
          wb.water_body_type,
          st.name AS settlement_name
      FROM sensors sn
      JOIN monitoring_stations ms
          ON ms.id = sn.monitoring_station_id
      JOIN water_bodies wb
          ON wb.id = ms.water_body_id
      LEFT JOIN settlements st
          ON st.id = ms.settlement_id
      ORDER BY sn.sensor_id;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "database_error",
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`HydroPulse API работает на порту ${process.env.PORT}`);
});