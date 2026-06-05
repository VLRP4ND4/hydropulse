import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LoginIcon from "@mui/icons-material/Login";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import Sidebar from "../../components/sidebar/Sidebar";
import Navbar from "../../components/navbar/Navbar";
import MeasurementForm from "../../components/measurementForm/MeasurementForm";
import { useAuth } from "../../context/authContext";
import {
  create_db_row,
  delete_db_row,
  get_db_table,
  get_db_tables,
  update_db_row,
} from "../../api/hydropulse_api";
import "./admin.scss";

const TABLE_LABELS = {
  water_bodies: "Водоемы",
  settlements: "Населенные пункты",
  monitoring_stations: "Гидропосты",
  sensors: "Датчики",
  water_level_measurements: "Замеры",
  alerts: "Оповещения",
};

const FIELD_LABELS = {
  id: "ID",
  name: "Название",
  water_body_type: "Тип",
  basin: "Бассейн",
  region: "Регион",
  district: "Район",
  water_body_id: "Водоем ID",
  settlement_id: "Нас. пункт ID",
  station_code: "Код",
  latitude: "Широта",
  longitude: "Долгота",
  danger_level_cm: "Опасный, см",
  critical_level_cm: "Критический, см",
  sensor_height_cm: "Высота датчика, см",
  sensor_angle_deg: "Угол датчика",
  is_active: "Активен",
  sensor_id: "Датчик ID",
  monitoring_station_id: "Гидропост ID",
  sensor_type: "Тип датчика",
  packet_id: "Пакет",
  distance_cm: "Расстояние, см",
  water_level_cm: "Уровень, см",
  hop_count: "Прыжки",
  rssi: "RSSI",
  snr: "SNR",
  measured_at: "Время замера",
  alert_type: "Тип тревоги",
  message: "Сообщение",
  resolved_at: "Закрыто",
};

// Начальная форма строится по описанию колонок, которое backend отдает из TABLE_DEFINITIONS.
function initial_form(columns) {
  return columns.reduce((acc, column) => {
    acc[column.name] = column.type === "boolean" ? true : "";
    return acc;
  }, {});
}

// Значения из PostgreSQL приводим к короткому виду для таблицы интерфейса.
function format_value(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (typeof value === "string" && value.includes("T") && value.endsWith("Z")) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}

// При редактировании null/undefined должны стать пустыми строками, иначе React input будет ругаться.
function normalize_form_value(value, column) {
  if (column.type === "boolean") return value === true || value === "true";
  return value === null || value === undefined ? "" : value;
}

// Универсальная админка: одна страница умеет просматривать и редактировать несколько таблиц,
// потому что схема приходит с backend, а не захардкожена в JSX.
const Admin = () => {
  const { user, isAdmin } = useAuth();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tableData, setTableData] = useState(null);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedDefinition = useMemo(
    () => tables.find((table) => table.name === selectedTable),
    [tables, selectedTable]
  );

  // При редактировании не показываем insert_only поля, например sensor_id менять нельзя.
  const formColumns = useMemo(() => {
    if (!selectedDefinition) return [];
    return selectedDefinition.columns.filter((column) => !editingId || !column.insert_only);
  }, [selectedDefinition, editingId]);

  useEffect(() => {
    let is_active = true;

    async function loadTables() {
      if (!user) return;
      try {
        // Сначала загружаем список таблиц, затем выбираем первую доступную.
        const result = await get_db_tables();
        if (!is_active) return;
        setTables(result);
        if (result[0]) setSelectedTable(result[0].name);
      } catch (err) {
        if (is_active) setError("Не удалось загрузить список таблиц");
      }
    }

    loadTables();

    return () => {
      is_active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedTable) return;
    loadTable(selectedTable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable]);

  async function loadTable(tableName = selectedTable) {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await get_db_table(tableName, 100);
      setTableData(result);
      setEditingId(null);
      setForm(initial_form(result.columns));
    } catch (err) {
      setError("Не удалось загрузить таблицу");
    } finally {
      setIsLoading(false);
    }
  }

  function updateForm(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEdit(row) {
    // Заполняем форму текущими значениями строки, чтобы пользователь редактировал запись на месте.
    const next = {};
    selectedDefinition.columns.forEach((column) => {
      next[column.name] = normalize_form_value(row[column.name], column);
    });
    setEditingId(row[selectedDefinition.primary_key]);
    setForm(next);
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(initial_form(selectedDefinition.columns));
  }

  async function submitForm(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      // editingId определяет режим формы: создание новой записи или обновление существующей.
      if (editingId) {
        await update_db_row(selectedTable, editingId, form);
        setMessage("Запись обновлена");
      } else {
        await create_db_row(selectedTable, form);
        setMessage("Запись добавлена");
      }
      await loadTable();
    } catch (err) {
      setError("Не удалось сохранить запись");
    }
  }

  async function removeRow(row) {
    // Удаление может не пройти, если на запись ссылаются другие таблицы через внешние ключи.
    const id = row[selectedDefinition.primary_key];
    if (!window.confirm(`Удалить запись ${id}?`)) return;

    try {
      await delete_db_row(selectedTable, id);
      setMessage("Запись удалена");
      await loadTable();
    } catch (err) {
      setError("Не удалось удалить запись. Возможно, на нее ссылаются другие таблицы.");
    }
  }

  async function refreshMeasurementsTable() {
    if (selectedTable === "water_level_measurements") {
      await loadTable("water_level_measurements");
    }
  }

  if (!user) {
    return (
      <div className="adminPage">
        <Sidebar />
        <div className="adminContainer">
          <Navbar />
          <div className="adminContent">
            <div className="adminAuthNotice">
              <div className="authNoticeBody">
                <span className="authNoticeKicker">
                  Защищенный раздел
                  <ShieldOutlinedIcon fontSize="small" />
                </span>
                <h1>Нужен вход</h1>
                <p>Войдите, чтобы открыть базу данных и инструменты управления гидропостами.</p>
                <div className="authNoticeActions">
                  <Link to="/login">
                    <LoginIcon fontSize="small" />
                    Войти
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adminPage">
      <Sidebar />
      <div className="adminContainer">
        <Navbar />
        <div className="adminContent">
          <div className="adminIntro">
            <div>
              <h1>База данных</h1>
              <p>{isAdmin ? "Режим администратора: просмотр, добавление, редактирование и удаление." : "Режим просмотра: изменения недоступны."}</p>
            </div>
            <span>{user.username} · {user.role}</span>
          </div>

          {isAdmin && (
            <MeasurementForm
              onSaved={refreshMeasurementsTable}
              title="Ручное добавление данных"
              description="Выбери гидропост и введи расстояние до воды. Запись попадет в PostgreSQL, а уровень и тревоги пересчитаются автоматически."
            />
          )}

          <div className="adminTabs">
            {tables.map((table) => (
              <button
                key={table.name}
                type="button"
                className={table.name === selectedTable ? "active" : ""}
                onClick={() => setSelectedTable(table.name)}
              >
                {TABLE_LABELS[table.name] || table.name}
              </button>
            ))}
          </div>

          {error && <div className="adminState error">{error}</div>}
          {message && <div className="adminState success">{message}</div>}

          {isAdmin && selectedDefinition && (
            <form className="adminForm" onSubmit={submitForm}>
              <div className="adminFormHeader">
                <h3>{editingId ? `Редактирование: ${editingId}` : "Новая запись"}</h3>
                {editingId && <button type="button" onClick={resetForm}>Отмена</button>}
              </div>

              <div className="adminFormGrid">
                {formColumns.map((column) => (
                  <label key={column.name}>
                    {FIELD_LABELS[column.name] || column.name}
                    {column.type === "boolean" ? (
                      <select
                        value={String(form[column.name])}
                        onChange={(event) => updateForm(column.name, event.target.value)}
                      >
                        <option value="true">да</option>
                        <option value="false">нет</option>
                      </select>
                    ) : (
                      <input
                        type={column.type === "number" ? "number" : "text"}
                        step={column.type === "number" ? "any" : undefined}
                        value={form[column.name] || ""}
                        onChange={(event) => updateForm(column.name, event.target.value)}
                        required={column.required}
                      />
                    )}
                  </label>
                ))}
              </div>

              <button type="submit">{editingId ? "Сохранить" : "Добавить"}</button>
            </form>
          )}

          <div className="adminTableWrap">
            {isLoading && <div className="adminState">Загрузка таблицы...</div>}

            {!isLoading && tableData && (
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>{tableData.primary_key}</th>
                    {tableData.columns
                      .filter((column) => column.name !== tableData.primary_key)
                      .map((column) => (
                        <th key={column.name}>{FIELD_LABELS[column.name] || column.name}</th>
                      ))}
                    {isAdmin && <th>Действия</th>}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row) => (
                    <tr key={row[tableData.primary_key]}>
                      <td>{format_value(row[tableData.primary_key])}</td>
                      {tableData.columns
                        .filter((column) => column.name !== tableData.primary_key)
                        .map((column) => (
                          <td key={column.name}>{format_value(row[column.name])}</td>
                        ))}
                      {isAdmin && (
                        <td className="rowActions">
                          <button type="button" onClick={() => startEdit(row)}>Изменить</button>
                          <button type="button" className="danger" onClick={() => removeRow(row)}>Удалить</button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {tableData.rows.length === 0 && (
                    <tr>
                      <td colSpan={tableData.columns.length + (isAdmin ? 1 : 0)}>Нет данных</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
