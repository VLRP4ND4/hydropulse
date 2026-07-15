import { useState } from "react";
import Sidebar from "../../components/sidebar/Sidebar";
import Navbar from "../../components/navbar/Navbar";
import DataDisclaimer from "../../components/disclaimer/DataDisclaimer";
import ForecastChart from "../../components/forecast/ForecastChart";
import SChart from "../../components/chart/Chart";
import "./forecast.scss";

// Раздел прогноза показывает расчетную модель и рядом обычный график последних замеров,
// чтобы можно было сравнить прогноз с фактической историей.
const Forecast = () => {
  const [selected_sensor_id, set_selected_sensor_id] = useState("");

  return (
    <div className="forecast">
      <Sidebar />
      <div className="forecastContainer">
        <Navbar />
        <DataDisclaimer />
        <div className="forecastPageContent">
          <div className="pageIntro">
            <h1>Прогнозирование</h1>
            <p>Минимальный рабочий прогноз: скорость подъёма воды и время до критической отметки.</p>
          </div>
          <ForecastChart
            sensorId={selected_sensor_id}
            onSensorChange={set_selected_sensor_id}
          />
          <SChart
            sensorId={selected_sensor_id}
            onSensorChange={set_selected_sensor_id}
            limit={10}
          />
        </div>
      </div>
    </div>
  );
};

export default Forecast;
