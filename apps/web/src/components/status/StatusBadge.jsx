import "./statusBadge.scss";

// Единая визуальная метка состояния уровня воды.
// status приходит из backend-а как normal, danger, critical или no_data.
const labels = {
  normal: "Нормально",
  danger: "Опасно",
  critical: "Критично",
  no_data: "Нет данных",
};

const StatusBadge = ({ status }) => {
  const value = status || "no_data";
  return <span className={`statusBadge ${value}`}>{labels[value] || value}</span>;
};

export default StatusBadge;
