import { useEffect, useState } from "react";
import "./measurementForm.scss";
import { create_admin_measurement, create_demo_measurement, get_sensors } from "../../api/hydropulse_api";
import { useAuth } from "../../context/authContext";

// Форма ручного ввода доступна только администратору.
// Она отправляет расстояние до воды, а backend сам рассчитывает уровень воды.
const MeasurementForm = ({
  selectedSensorId,
  onSaved,
  title = "Ручной ввод замера",
  description = "Администратор может вручную добавить расстояние от датчика до воды. Уровень воды и тревоги backend рассчитает сам.",
}) => {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const [sensors, set_sensors] = useState([]);
  const [sensor_id, set_sensor_id] = useState(selectedSensorId || "");
  const [distance_cm, set_distance_cm] = useState(220);
  const [is_saving, set_is_saving] = useState(false);
  const [message, set_message] = useState("");

  useEffect(() => {
    if (!isAdmin) return undefined;
    let is_active = true;

    // Загружаем датчики, чтобы пользователь мог выбрать sensor_id из базы.
    get_sensors()
      .then((data) => {
        if (!is_active) return;
        set_sensors(data);
        set_sensor_id((current) => current || (data[0] ? data[0].sensor_id : ""));
      })
      .catch(() => {
        if (is_active) set_message("Не получилось загрузить датчики");
      });

    return () => {
      is_active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (selectedSensorId) set_sensor_id(selectedSensorId);
  }, [selectedSensorId]);

  if (isAuthLoading || !isAdmin) return null;

  async function save_measurement(event) {
    event.preventDefault();
    set_is_saving(true);
    set_message("");

    try {
      // Ручной ввод идет через админскую ручку, а аппаратные замеры остаются на своем канале.
      await create_admin_measurement({
        sensor_id,
        distance_cm: Number(distance_cm),
        packet_id: Date.now(),
        hop_count: 0,
      });
      set_message("Замер сохранён в PostgreSQL");
      if (onSaved) onSaved();
    } catch (err) {
      set_message(`Ошибка: ${err.message}`);
    } finally {
      set_is_saving(false);
    }
  }

  async function add_demo() {
    if (!sensor_id) return;
    set_is_saving(true);
    set_message("");

    try {
      // create_demo_measurement генерирует правдоподобный случайный замер на backend.
      await create_demo_measurement(sensor_id);
      set_message("Тестовый замер добавлен");
      if (onSaved) onSaved();
    } catch (err) {
      set_message(`Ошибка: ${err.message}`);
    } finally {
      set_is_saving(false);
    }
  }

  return (
    <div className="measurementForm">
      <h3>{title}</h3>
      <p>{description}</p>

      <form onSubmit={save_measurement}>
        <label>
          Датчик
          <select value={sensor_id} onChange={(event) => set_sensor_id(event.target.value)}>
            {sensors.map((sensor) => (
              <option key={sensor.sensor_id} value={sensor.sensor_id}>
                {sensor.sensor_id} — {sensor.monitoring_station_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Расстояние до воды, см
          <input
            type="number"
            min="0"
            step="0.1"
            value={distance_cm}
            onChange={(event) => set_distance_cm(event.target.value)}
          />
        </label>

        <div className="formActions">
          <button type="submit" disabled={is_saving || !sensor_id}>Сохранить замер</button>
          <button type="button" onClick={add_demo} disabled={is_saving || !sensor_id}>Случайный замер</button>
        </div>
      </form>

      {message && <div className="formMessage">{message}</div>}
    </div>
  );
};

export default MeasurementForm;
