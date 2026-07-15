import "./chart.scss";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { useParams } from "react-router-dom";
import { get_latest_monitoring_stations, get_water_level_measurements } from "../../api/hydropulse_api";
import { DarkModeContext } from "../../context/darkModeContext";
import { with_chart_theme } from "./chartTheme";

// Обычный график истории измерений по одному датчику.
// Используется и на странице графиков, и рядом с прогнозом.
function format_time(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}

const SChart = ({ sensorId, onSensorChange, hours = 24, limit = null }) => {
  const params = useParams();
  const { darkMode } = useContext(DarkModeContext);
  const route_sensor_id = sensorId || params.id || "";
  const [current_sensor_id, set_current_sensor_id] = useState(route_sensor_id);
  const [measurement_limit, set_measurement_limit] = useState(limit);
  const [stations, set_stations] = useState([]);
  const [measurements, set_measurements] = useState([]);
  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState(null);

  const select_sensor_id = useCallback((value) => {
    set_current_sensor_id(value);
    set_measurements([]);
    set_is_loading(true);
    if (onSensorChange) onSensorChange(value);
  }, [onSensorChange]);

  function select_measurement_limit(value) {
    set_measurement_limit(Number(value));
    set_measurements([]);
    set_is_loading(true);
  }

  useEffect(() => {
    let is_active = true;

    async function load_stations() {
      // Список станций нужен для выпадающего выбора датчика.
      try {
        const data = await get_latest_monitoring_stations();
        if (!is_active) return;
        set_stations(data);
        if (!route_sensor_id && data[0]) {
          select_sensor_id(data[0].sensor_id);
        }
      } catch (err) {
        if (!is_active) return;
        set_error("Ошибка загрузки списка датчиков");
      }
    }

    load_stations();

    return () => {
      is_active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!route_sensor_id) return;
    select_sensor_id(route_sensor_id);
  }, [route_sensor_id, select_sensor_id]);

  useEffect(() => {
    if (!current_sensor_id) return;
    let is_active = true;

    async function load_data() {
      try {
        // limit берет последние N замеров, hours — все замеры за период.
        const data = await get_water_level_measurements(
          current_sensor_id,
          measurement_limit ? { limit: measurement_limit } : { hours }
        );
        if (!is_active) return;
        set_measurements(data);
        set_error(null);
      } catch (err) {
        if (!is_active) return;
        console.error(err);
        set_error("Ошибка загрузки графика");
      } finally {
        if (is_active) set_is_loading(false);
      }
    }

    load_data();
    const timer = setInterval(load_data, 5000);

    return () => {
      is_active = false;
      clearInterval(timer);
    };
  }, [current_sensor_id, hours, measurement_limit]);

  const chart_data = {
    // Три линии: фактический уровень, опасный порог и критический порог.
    labels: measurements.map((item) => format_time(item.measured_at)),
    datasets: [
      {
        label: "Уровень воды, см",
        data: measurements.map((item) => item.water_level_cm),
        borderWidth: 2,
        tension: 0.25,
        fill: false,
      },
      {
        label: "Опасный уровень, см",
        data: measurements.map((item) => item.danger_level_cm),
        borderWidth: 1,
        borderDash: [6, 6],
        fill: false,
      },
      {
        label: "Критический уровень, см",
        data: measurements.map((item) => item.critical_level_cm),
        borderWidth: 1,
        borderDash: [3, 4],
        fill: false,
      },
    ],
  };

  const chart_options = with_chart_theme(
    {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "см",
          },
        },
      },
    },
    darkMode
  );

  const chart_period_text = measurement_limit
    ? `Последние ${measurement_limit} замеров из базы данных. Загружено точек: ${measurements.length}.`
    : `Последние ${hours} ч. Данные обновляются автоматически.`;

  return (
    <div className="achart">
      <div className="chartHeader">
        <div>
          <h3>График уровня воды</h3>
          <p>{chart_period_text}</p>
        </div>
        <div className="chartControls">
          {limit && (
            <label className="limitControl">
              <span>Показывать</span>
              <select
                aria-label="Количество последних замеров"
                value={measurement_limit}
                onChange={(event) => select_measurement_limit(event.target.value)}
              >
                {[10, 20, 30].map((value) => (
                  <option key={value} value={value}>{value} замеров</option>
                ))}
              </select>
            </label>
          )}
          <select
            aria-label="Гидропост"
            value={current_sensor_id}
            onChange={(event) => select_sensor_id(event.target.value)}
          >
            {stations.map((station) => (
              <option key={station.sensor_id} value={station.sensor_id}>
                {station.sensor_id} — {station.monitoring_station_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {is_loading && <div className="chartState">Загрузка графика...</div>}
      {error && <div className="chartState error">{error}</div>}
      {!is_loading && !error && measurements.length === 0 && (
        <div className="chartState">Нет измерений за выбранный период</div>
      )}
      {!is_loading && !error && measurements.length > 0 && <Line data={chart_data} options={chart_options} />}
    </div>
  );
};

export default SChart;
