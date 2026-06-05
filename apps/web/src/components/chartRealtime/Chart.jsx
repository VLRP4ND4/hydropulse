import SChart from "../chart/Chart";
import "./chart.scss";

// Обертка над основным графиком: показывает только последний час данных.
const RealtimeChart = ({ sensorId }) => {
  return <SChart sensorId={sensorId} hours={1} />;
};

export default RealtimeChart;
