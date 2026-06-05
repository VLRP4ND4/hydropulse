import "./alertsList.scss";
import StatusBadge from "../status/StatusBadge";

// Список активных тревог на главной странице.
// Данные уже приходят из backend-а с названием гидропоста и текстом сообщения.
const AlertsList = ({ alerts = [] }) => {
  return (
    <div className="alertsList">
      <div className="alertsHeader">
        <h3>Последние оповещения</h3>
        <span>{alerts.length}</span>
      </div>

      <div className="alertsBody">
        {alerts.map((alert) => (
          <div className="alertItem" key={alert.id}>
            <div>
              <b>{alert.monitoring_station_name}</b>
              <p>{alert.message}</p>
              <small>{alert.created_at ? new Date(alert.created_at).toLocaleString() : "—"}</small>
            </div>
            <StatusBadge status={alert.alert_type} />
          </div>
        ))}

        {alerts.length === 0 && <div className="emptyAlert">Оповещений пока нет</div>}
      </div>
    </div>
  );
};

export default AlertsList;
