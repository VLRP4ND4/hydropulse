import { useMemo, useState } from "react";
import Sidebar from "../../components/sidebar/Sidebar";
import Navbar from "../../components/navbar/Navbar";
import "./home.scss";
import Widget from "../../components/widget/Widget";
import Featured from "../../components/featured/Featured";
import GMap from "../../components/map/GMap";
import StationsTable from "../../components/stations/StationsTable";
import AlertsList from "../../components/alerts/AlertsList";
import MeasurementForm from "../../components/measurementForm/MeasurementForm";
import usePolling from "../../hooks/usePolling";
import { get_alerts, get_forecast, get_latest_monitoring_stations } from "../../api/hydropulse_api";

// Главная страница собирает оперативную картину: текущие уровни, карту,
// активные тревоги, прогноз выбранного гидропоста и тестовый ввод замеров.
const Home = () => {
  // Гидропосты обновляются чаще, тревоги чуть реже, чтобы не перегружать API.
  const stations_state = usePolling(get_latest_monitoring_stations, [], 5000);
  const alerts_state = usePolling(() => get_alerts(10), [], 7000);
  const stations = useMemo(() => stations_state.data || [], [stations_state.data]);
  const alerts = useMemo(() => alerts_state.data || [], [alerts_state.data]);
  const [selected_id, set_selected_id] = useState(null);

  // Если пользователь еще ничего не выбрал, показываем первый гидропост из ответа API.
  const selected_station = useMemo(() => {
    if (stations.length === 0) return null;
    return stations.find((item) => String(item.monitoring_station_id) === String(selected_id)) || stations[0];
  }, [stations, selected_id]);

  const forecast_state = usePolling(
    // Прогноз зависит от выбранного датчика. Если станции нет, возвращаем пустой Promise.
    () => selected_station ? get_forecast(selected_station.sensor_id, 60) : Promise.resolve(null),
    [selected_station && selected_station.sensor_id],
    10000
  );

  const unresolved_alerts = alerts.filter((item) => !item.resolved_at);

  return (
    <div className="home">
      <Sidebar />
      <div className="homeContainer">
        <Navbar />

        <div className="pageIntro">
          <div>
            <h1>HydroPulse</h1>
            <p>Веб-система мониторинга уровня воды.</p>
          </div>
        </div>

        {stations_state.error && (
          <div className="apiError">
            Не удалось получить данные с API. Запусти backend из папки <b>apps/api</b> командой <b>npm run dev</b> и проверь PostgreSQL.
          </div>
        )}

        <div className="widgets">
          <Widget type="water" station={selected_station} />
          <Widget type="critical" station={selected_station} />
          <Widget type="diff" station={selected_station} />
          <Widget type="status" station={selected_station} />
        </div>

        <div className="charts mainGrid">
          <Featured station={selected_station} forecast={forecast_state.data} />
          <GMap
            title="Карта мониторинга паводков"
            stations={stations}
            selectedStationId={selected_station && selected_station.monitoring_station_id}
            onSelectStation={set_selected_id}
          />
        </div>

        <div className="contentGrid">
          <StationsTable
            stations={stations}
            selectedStationId={selected_station && selected_station.monitoring_station_id}
            onSelectStation={set_selected_id}
          />
          <div className="sideStack">
            <MeasurementForm selectedSensorId={selected_station && selected_station.sensor_id} />
            <AlertsList alerts={unresolved_alerts} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
