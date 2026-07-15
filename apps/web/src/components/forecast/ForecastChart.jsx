import "./forecastChart.scss";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { get_forecast, get_latest_monitoring_stations } from "../../api/hydropulse_api";
import { DarkModeContext } from "../../context/darkModeContext";
import { with_chart_theme } from "../chart/chartTheme";

// Компонент визуализирует результат backend-модели прогноза:
// фактическую историю, прогнозную линию, верхний/нижний коридор риска и критический порог.
function format_number(value, digits = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "—";
}

function format_hours(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)} ч` : "—";
}

// Переводит машинное значение confidence в русскую подпись для карточки метрик.
function confidence_label(value) {
  const labels = {
    high: "высокая",
    medium: "средняя",
    low: "низкая",
  };
  return labels[value] || "низкая";
}

const ForecastChart = ({ sensorId, onSensorChange }) => {
  const { darkMode } = useContext(DarkModeContext);
  const [stations, set_stations] = useState([]);
  const [current_sensor_id, set_current_sensor_id] = useState(sensorId || "");
  const [forecast, set_forecast] = useState(null);
  const [error, set_error] = useState(null);

  const select_sensor_id = useCallback((value, notify_parent = true) => {
    set_current_sensor_id(value);
    set_forecast(null);
    set_error(null);
    if (notify_parent && onSensorChange) onSensorChange(value);
  }, [onSensorChange]);

  useEffect(() => {
    // Первым запросом загружаем станции, чтобы выбрать датчик по умолчанию.
    get_latest_monitoring_stations()
      .then((data) => {
        set_stations(data);
        if (!sensorId && data[0]) select_sensor_id(data[0].sensor_id);
      })
      .catch(() => set_error("Ошибка загрузки станций"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sensorId) select_sensor_id(sensorId, false);
  }, [sensorId, select_sensor_id]);

  useEffect(() => {
    if (!current_sensor_id) return undefined;
    let is_active = true;

    async function load() {
      try {
        // Backend возвращает уже рассчитанную модель, frontend только рисует и показывает метрики.
        const data = await get_forecast(current_sensor_id, {
          model_limit: 120,
          history_limit: 24,
          horizon_hours: 12,
          forecast_step_hours: 1,
        });
        if (!is_active) return;
        set_forecast(data);
        set_error(null);
      } catch (err) {
        if (!is_active) return;
        set_error("Ошибка расчета прогноза");
      }
    }

    load();
    const timer = setInterval(load, 10000);
    return () => {
      is_active = false;
      clearInterval(timer);
    };
  }, [current_sensor_id]);

  const corridor_datasets = forecast && forecast.corridor_available !== false
    ? [
        {
          label: "Верхний коридор риска, см",
          data: forecast.points ? forecast.points.map((item) => item.forecast_upper_cm) : [],
          borderColor: "#f97316",
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.2,
          spanGaps: true,
        },
        {
          label: "Нижний коридор риска, см",
          data: forecast.points ? forecast.points.map((item) => item.forecast_lower_cm) : [],
          borderColor: "#94a3b8",
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.2,
          spanGaps: true,
        },
      ]
    : [];

  const chart_data = {
    // Chart.js получает один массив labels и несколько datasets; null-значения
    // позволяют разнести фактические и прогнозные участки на одном графике.
    labels: forecast && forecast.points ? forecast.points.map((item) => item.label) : [],
    datasets: [
      {
        label: "Фактический уровень, см",
        data: forecast && forecast.points ? forecast.points.map((item) => item.water_level_cm) : [],
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        borderWidth: 2,
        tension: 0.25,
        spanGaps: true,
      },
      {
        label: "Прогноз, см",
        data: forecast && forecast.points ? forecast.points.map((item) => item.forecast_level_cm) : [],
        borderColor: "#0f766e",
        backgroundColor: "rgba(15, 118, 110, 0.12)",
        borderWidth: 2,
        borderDash: [6, 6],
        tension: 0.25,
        spanGaps: true,
      },
      ...corridor_datasets,
      {
        label: "Критический уровень, см",
        data: forecast && forecast.points ? forecast.points.map(() => forecast.critical_level_cm) : [],
        borderColor: "#dc2626",
        borderWidth: 1,
        borderDash: [3, 4],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const chart_options = with_chart_theme(
    {
      // maintainAspectRatio=false дает SCSS-контейнеру управлять высотой графика.
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
    darkMode
  );

  return (
    <div className="forecastChart">
      <div className="forecastHeader">
        <div>
          <h3>Прогноз паводкового риска</h3>
          <p>Взвешенный тренд, скорость последних замеров и коридор риска на 12 часов.</p>
        </div>
        <select
          aria-label="Гидропост прогноза"
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

      {error && <div className="forecastState error">{error}</div>}
      {!error && !forecast && <div className="forecastState">Загрузка прогноза...</div>}
      {!error && forecast && (
        <>
          <div className="forecastStats">
            <div>
              <b>{format_number(forecast.rise_rate_cm_per_hour)} см/ч</b>
              <span>скорость подъема</span>
            </div>
            <div>
              <b>{format_hours(forecast.hours_to_critical)}</b>
              <span>до критического</span>
            </div>
            <div>
              <b>{forecast.warning || "Норма"}</b>
              <span>вывод системы</span>
            </div>
            <div>
              <b>{confidence_label(forecast.confidence)}</b>
              <span>уверенность прогноза</span>
            </div>
          </div>
          <div className="forecastMeta">
            <span>Расчет: {forecast.sample_count || 0} достоверных замеров</span>
            <span>На графике: {forecast.displayed_sample_count || 0} фактических точек</span>
            {forecast.excluded_sample_count > 0 && (
              <span>Скрыто погрешных: {forecast.excluded_sample_count}</span>
            )}
            <span>Горизонт: {format_hours(forecast.forecast_horizon_hours)}</span>
            <span>Шаг: {format_hours(forecast.forecast_step_hours)}</span>
            <span>Разброс: {format_number(forecast.residual_std_cm)} см</span>
            <span>Ускорение: {format_number(forecast.acceleration_cm_per_hour2, 2)} см/ч²</span>
            {forecast.corridor_available === false && (
              <span>Коридор скрыт: нестабильные данные</span>
            )}
          </div>
          <div className="forecastCanvas">
            <Line data={chart_data} options={chart_options} />
          </div>
        </>
      )}
    </div>
  );
};

export default ForecastChart;
