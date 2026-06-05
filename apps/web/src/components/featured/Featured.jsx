import "./featured.scss";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import KeyboardArrowUpOutlinedIcon from "@mui/icons-material/KeyboardArrowUpOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import StatusBadge from "../status/StatusBadge";

// Центральная карточка показывает выбранный гидропост как процент от критического уровня.
function number_or_null(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function format_cm(value) {
  const parsed = number_or_null(value);
  return parsed === null ? "—" : `${parsed.toFixed(1)} см`;
}

// Процент ограничен сверху 150%, чтобы критическое превышение было видно,
// но круговая диаграмма не ломалась от больших значений.
function percent_level(station) {
  const level = number_or_null(station && station.water_level_cm);
  const critical = number_or_null(station && station.critical_level_cm);

  if (level === null || critical === null || critical <= 0) return 0;
  return Math.max(0, Math.min(150, Math.round((level * 100) / critical)));
}

const Featured = ({ station, forecast }) => {
  // speed и eta приходят из прогнозной модели backend-а.
  const percent = percent_level(station);
  const speed = forecast && forecast.rise_rate_cm_per_hour;
  const eta = forecast && forecast.hours_to_critical;

  return (
    <div className="featured">
      <div className="top">
        <h1 className="title">Паводковая ситуация</h1>
        <StatusBadge status={station && station.water_level_status} />
      </div>

      {!station ? (
        <div className="emptyState">Нет данных по гидропостам</div>
      ) : (
        <div className="bottom">
          <div className="featuredChart">
            <CircularProgressbar
              value={Math.min(percent, 100)}
              text={`${percent}%`}
              strokeWidth={10}
            />
          </div>

          <p className="title">{station.monitoring_station_name}</p>
          <p className="amount">{format_cm(station.water_level_cm)}</p>
          <p className="desc">
            Река: {station.water_body_name}. Опасный уровень: {format_cm(station.danger_level_cm)}, критический: {format_cm(station.critical_level_cm)}.
          </p>

          <div className="summary">
            <div className="item">
              <div className="itemTitle">Подъём</div>
              <div className={`itemResult ${Number(speed) > 0 ? "positive" : "neutral"}`}>
                <KeyboardArrowUpOutlinedIcon fontSize="small" />
                <div className="resultAmount">
                  {Number.isFinite(Number(speed)) ? `${Number(speed).toFixed(1)} см/ч` : "—"}
                </div>
              </div>
            </div>

            <div className="item">
              <div className="itemTitle">До критич.</div>
              <div className="itemResult neutral">
                <WarningAmberIcon fontSize="small" />
                <div className="resultAmount">
                  {Number.isFinite(Number(eta)) ? `${Number(eta).toFixed(1)} ч` : "—"}
                </div>
              </div>
            </div>

            <div className="item">
              <div className="itemTitle">Последний замер</div>
              <div className="itemResult neutral">
                <div className="resultAmount">
                  {station.measured_at ? new Date(station.measured_at).toLocaleString() : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Featured;
