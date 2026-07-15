import Sidebar from "../../components/sidebar/Sidebar";
import Navbar from "../../components/navbar/Navbar";
import DataDisclaimer from "../../components/disclaimer/DataDisclaimer";
import ForecastChart from "../../components/forecast/ForecastChart";
import SChart from "../../components/chart/Chart";
import "./forecast.scss";

// Раздел прогноза показывает расчетную модель и рядом обычный график последних замеров,
// чтобы можно было сравнить прогноз с фактической историей.
const Forecast = () => {
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
          <ForecastChart />
          <SChart limit={10} />
        </div>
      </div>
    </div>
  );
};

export default Forecast;
