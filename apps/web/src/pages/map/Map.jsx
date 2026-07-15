import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/sidebar/Sidebar";
import Navbar from "../../components/navbar/Navbar";
import DataDisclaimer from "../../components/disclaimer/DataDisclaimer";
import "./map.scss";
import GMap from "../../components/map/GMap";
import StationsTable from "../../components/stations/StationsTable";
import usePolling from "../../hooks/usePolling";
import {
  create_monitoring_station_with_sensor,
  get_db_table,
  get_latest_monitoring_stations,
} from "../../api/hydropulse_api";
import { useAuth } from "../../context/authContext";

const initial_marker_form = {
  name: "",
  station_code: "",
  water_body_id: "",
  settlement_id: "",
  danger_level_cm: 300,
  critical_level_cm: 400,
  sensor_height_cm: 600,
  sensor_angle_deg: 0,
  sensor_id: "",
};

// Страница карты показывает гидропосты из PostgreSQL и, для администратора,
// позволяет создать новый гидропост вместе с датчиком прямо по клику на карте.
const Map = () => {
  const { isAdmin } = useAuth();
  const { data, error, reload } = usePolling(get_latest_monitoring_stations, [], 5000);
  const stations = useMemo(() => data || [], [data]);
  const [selected_id, set_selected_id] = useState(null);
  const [add_mode, set_add_mode] = useState(false);
  const [marker_form, set_marker_form] = useState(initial_marker_form);
  const [marker_message, set_marker_message] = useState("");
  const [marker_error, set_marker_error] = useState("");
  const [reference_data, set_reference_data] = useState({ water_bodies: [], settlements: [] });
  // Выбранная станция синхронизирует таблицу и карту.
  const selected_station = useMemo(() => {
    if (stations.length === 0) return null;
    return stations.find((item) => String(item.monitoring_station_id) === String(selected_id)) || stations[0];
  }, [stations, selected_id]);

  useEffect(() => {
    let is_active = true;

    async function load_reference_data() {
      // Справочники нужны только администратору для формы создания метки.
      if (!isAdmin) return;

      try {
        const [water_bodies, settlements] = await Promise.all([
          get_db_table("water_bodies", 100),
          get_db_table("settlements", 100),
        ]);

        if (!is_active) return;
        set_reference_data({
          water_bodies: water_bodies.rows,
          settlements: settlements.rows,
        });
        set_marker_form((current) => ({
          ...current,
          water_body_id: current.water_body_id || (water_bodies.rows[0] && water_bodies.rows[0].id) || "",
          settlement_id: current.settlement_id || (settlements.rows[0] && settlements.rows[0].id) || "",
        }));
      } catch (err) {
        if (is_active) set_marker_error("Не удалось загрузить справочники для формы метки");
      }
    }

    load_reference_data();

    return () => {
      is_active = false;
    };
  }, [isAdmin]);

  function update_marker_form(name, value) {
    set_marker_form((current) => ({ ...current, [name]: value }));
  }

  function handle_map_click(position) {
    // При клике на карту автоматически подставляем координаты и черновые коды,
    // чтобы администратор быстрее создал новую точку мониторинга.
    const suffix = Date.now().toString().slice(-5);
    set_marker_form((current) => ({
      ...current,
      latitude: position.lat,
      longitude: position.lng,
      name: current.name || "Новый гидропост",
      station_code: current.station_code || `POST-${suffix}`,
      sensor_id: current.sensor_id || `S-${suffix}`,
    }));
    set_marker_message(`Координаты выбраны: ${position.lat}, ${position.lng}`);
  }

  async function submit_marker(event) {
    event.preventDefault();
    set_marker_error("");
    set_marker_message("");

    if (!marker_form.latitude || !marker_form.longitude) {
      set_marker_error("Сначала выберите точку на карте или введите координаты вручную");
      return;
    }

    try {
      // Backend создает monitoring_stations и sensors одной транзакцией.
      await create_monitoring_station_with_sensor({
        ...marker_form,
        is_active: true,
        sensor_type: "ultrasonic",
      });
      set_marker_message("Метка добавлена");
      set_marker_form(initial_marker_form);
      set_add_mode(false);
      reload();
    } catch (err) {
      set_marker_error("Не удалось добавить метку. Проверьте обязательные поля и уникальность sensor_id/кода.");
    }
  }

  return (
    <div className="map">
      <Sidebar />
      <div className="mapContainer">
        <Navbar />
        <DataDisclaimer />
        <div className="mapPageContent">
          <div className="pageIntro small">
            <h1>Карта гидропостов</h1>
            {isAdmin && (
              <button type="button" className={add_mode ? "mapMode active" : "mapMode"} onClick={() => set_add_mode((value) => !value)}>
                {add_mode ? "Отменить добавление" : "Добавить метку"}
              </button>
            )}
          </div>
          {error && <div className="apiError">API недоступен. Проверь backend и PostgreSQL.</div>}
          {isAdmin && add_mode && (
            <form className="markerForm" onSubmit={submit_marker}>
              <div className="markerFormHeader">
                <h3>Новая метка</h3>
                <p>Кликните по карте или задайте координаты вручную.</p>
              </div>
              <label>
                Название
                <input value={marker_form.name} onChange={(event) => update_marker_form("name", event.target.value)} required />
              </label>
              <label>
                Код станции
                <input value={marker_form.station_code} onChange={(event) => update_marker_form("station_code", event.target.value)} required />
              </label>
              <label>
                Водоем
                <select value={marker_form.water_body_id} onChange={(event) => update_marker_form("water_body_id", event.target.value)} required>
                  {reference_data.water_bodies.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Населенный пункт
                <select value={marker_form.settlement_id} onChange={(event) => update_marker_form("settlement_id", event.target.value)}>
                  <option value="">Без привязки</option>
                  {reference_data.settlements.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Широта
                <input type="number" step="any" value={marker_form.latitude || ""} onChange={(event) => update_marker_form("latitude", event.target.value)} required />
              </label>
              <label>
                Долгота
                <input type="number" step="any" value={marker_form.longitude || ""} onChange={(event) => update_marker_form("longitude", event.target.value)} required />
              </label>
              <label>
                Опасный уровень, см
                <input type="number" step="any" value={marker_form.danger_level_cm} onChange={(event) => update_marker_form("danger_level_cm", event.target.value)} />
              </label>
              <label>
                Критический уровень, см
                <input type="number" step="any" value={marker_form.critical_level_cm} onChange={(event) => update_marker_form("critical_level_cm", event.target.value)} />
              </label>
              <label>
                Высота датчика, см
                <input type="number" step="any" value={marker_form.sensor_height_cm} onChange={(event) => update_marker_form("sensor_height_cm", event.target.value)} />
              </label>
              <label>
                Датчик ID
                <input value={marker_form.sensor_id} onChange={(event) => update_marker_form("sensor_id", event.target.value)} required />
              </label>
              <button type="submit">Сохранить метку</button>
              {marker_message && <div className="markerState success">{marker_message}</div>}
              {marker_error && <div className="markerState error">{marker_error}</div>}
            </form>
          )}
          <GMap
            title="Карта мониторинга паводков"
            stations={stations}
            selectedStationId={selected_station && selected_station.monitoring_station_id}
            onSelectStation={set_selected_id}
            addMode={add_mode}
            onMapClick={handle_map_click}
          />
          <StationsTable
            stations={stations}
            selectedStationId={selected_station && selected_station.monitoring_station_id}
            onSelectStation={set_selected_id}
          />
        </div>
      </div>
    </div>
  );
};

export default Map;
