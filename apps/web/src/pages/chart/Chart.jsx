import Sidebar from "../../components/sidebar/Sidebar";
import Navbar from "../../components/navbar/Navbar";
import SChart from "../../components/chart/Chart";
import MeasurementForm from "../../components/measurementForm/MeasurementForm";
import { useParams } from "react-router-dom";
import "./chart.scss";

// Страница истории замеров: показывает график из PostgreSQL и форму ручного тестового ввода.
const Chart = () => {
  const { id } = useParams();

  return (
    <div className="chart">
      <Sidebar />
      <div className="chartContainer">
        <Navbar />
        <div className="chartPageContent">
          <div className="pageIntro">
            <h1>Графики измерений</h1>
            <p>История уровня воды из PostgreSQL по последним записанным замерам.</p>
          </div>
          <SChart sensorId={id} limit={10} />
          <MeasurementForm selectedSensorId={id} />
        </div>
      </div>
    </div>
  );
};

export default Chart;
