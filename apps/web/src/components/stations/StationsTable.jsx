import "./stationsTable.scss";
import StatusBadge from "../status/StatusBadge";

// Таблица гидропостов служит и списком, и элементом выбора:
// клик по строке синхронизирует выбранный пост с картой и виджетами.
function format_cm(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)} см` : "—";
}

const StationsTable = ({ stations = [], onSelectStation, selectedStationId }) => {
  return (
    <div className="stationsTable">
      <div className="tableHeader">
        <h3>Гидропосты</h3>
        <span>{stations.length} записей</span>
      </div>

      <div className="tableScroll">
        <table>
          <thead>
            <tr>
              <th>Пост</th>
              <th>Река</th>
              <th>Уровень</th>
              <th>Опасный</th>
              <th>Критический</th>
              <th>Статус</th>
              <th>Время</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => (
              <tr
                key={station.monitoring_station_id}
                className={String(selectedStationId) === String(station.monitoring_station_id) ? "selected" : ""}
                onClick={() => onSelectStation && onSelectStation(station.monitoring_station_id)}
              >
                <td>
                  <b>{station.monitoring_station_name}</b>
                  <small>{station.station_code || station.sensor_id}</small>
                </td>
                <td>{station.water_body_name}</td>
                <td>{format_cm(station.water_level_cm)}</td>
                <td>{format_cm(station.danger_level_cm)}</td>
                <td>{format_cm(station.critical_level_cm)}</td>
                <td><StatusBadge status={station.water_level_status} /></td>
                <td>{station.measured_at ? new Date(station.measured_at).toLocaleString() : "—"}</td>
              </tr>
            ))}

            {stations.length === 0 && (
              <tr>
                <td colSpan="7" className="emptyCell">Нет данных. Проверь API и заполнение PostgreSQL.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StationsTable;
