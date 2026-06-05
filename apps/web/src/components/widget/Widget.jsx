import "./widget.scss";
import WaterIcon from "@mui/icons-material/Water";
import ReportIcon from "@mui/icons-material/Report";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import DifferenceIcon from "@mui/icons-material/Difference";
import SensorsIcon from "@mui/icons-material/Sensors";
import StatusBadge from "../status/StatusBadge";

// Небольшие карточки на главной странице: текущий уровень, пороги, разница до критического и статус.
function format_cm(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(1)} см`;
}

// Показывает запас до критической отметки: положительное значение значит, что порог еще не достигнут.
function diff_to_critical(station) {
  if (!station || station.water_level_cm === null || station.critical_level_cm === null) {
    return "—";
  }

  return format_cm(Number(station.critical_level_cm) - Number(station.water_level_cm));
}

const Widget = ({ type, station, stations_count = 0, alerts_count = 0 }) => {
  // Описание карточек собрано в объект, чтобы JSX ниже был одинаковым для всех типов.
  const cards = {
    water: {
      title: "Текущий уровень",
      value: format_cm(station && station.water_level_cm),
      link: station ? station.monitoring_station_name : "Нет выбранного поста",
      icon: <WaterIcon className="icon water" />,
    },
    critical: {
      title: "Критический уровень",
      value: format_cm(station && station.critical_level_cm),
      link: station ? station.water_body_name : "Порог задаётся в БД",
      icon: <ReportIcon className="icon critical" />,
    },
    diff: {
      title: "До критического",
      value: diff_to_critical(station),
      link: station ? `Датчик: ${station.sensor_id || "—"}` : "Нет данных",
      icon: <DifferenceIcon className="icon diff" />,
    },
    status: {
      title: "Статус",
      value: <StatusBadge status={station && station.water_level_status} />,
      link: station ? station.settlement_name || station.district || "Локация не указана" : "Нет данных",
      icon: <QuestionMarkIcon className="icon status" />,
    },
    stations: {
      title: "Гидропосты",
      value: stations_count,
      link: "Активные точки мониторинга",
      icon: <SensorsIcon className="icon water" />,
    },
    alerts: {
      title: "Оповещения",
      value: alerts_count,
      link: "Нерешённые события",
      icon: <ReportIcon className="icon critical" />,
    },
  };

  const data = cards[type] || cards.water;

  return (
    <div className="widget">
      <div className="left">
        <span className="title">{data.title}</span>
        <span className="counter">{data.value}</span>
        <span className="link">{data.link}</span>
      </div>
      <div className="right">{data.icon}</div>
    </div>
  );
};

export default Widget;
