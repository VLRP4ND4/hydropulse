import "./navbar.scss";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import HomeIcon from "@mui/icons-material/Home";
import MapIcon from "@mui/icons-material/Map";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AssessmentIcon from "@mui/icons-material/Assessment";
import StorageIcon from "@mui/icons-material/Storage";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import WaterIcon from "@mui/icons-material/Water";
import { DarkModeContext } from "../../context/darkModeContext";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get_alerts, get_latest_monitoring_stations } from "../../api/hydropulse_api";
import StatusBadge from "../status/StatusBadge";
import { useAuth } from "../../context/authContext";

// Верхняя панель: умный поиск, переключатель темы и выпадающий список активных тревог.
function format_time(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function normalize_text(value) {
  return String(value || "").toLowerCase().trim();
}

function format_cm(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)} см` : "—";
}

const Navbar = () => {
  const { dispatch } = useContext(DarkModeContext);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchStations, setSearchStations] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const notificationRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  // В панели показываем только незакрытые тревоги.
  const activeAlerts = useMemo(() => alerts.filter((alert) => !alert.resolved_at), [alerts]);
  const routeResults = useMemo(() => ([
    {
      kind: "route",
      label: "Главная",
      description: "Сводка уровней, карта и активные тревоги",
      tag: "сводка",
      path: "/",
      keywords: "главная dashboard дашборд мониторинг уровень тревоги",
      icon: <HomeIcon />,
    },
    {
      kind: "route",
      label: "Карта гидропостов",
      description: "Метки, координаты и добавление новых точек",
      tag: "карта",
      path: "/maps",
      keywords: "карта maps координаты метки посты реки",
      icon: <MapIcon />,
    },
    {
      kind: "route",
      label: "Графики",
      description: "История замеров по датчикам",
      tag: "анализ",
      path: "/chart/001",
      keywords: "график графики chart измерения история датчик",
      icon: <ShowChartIcon />,
    },
    {
      kind: "route",
      label: "Прогноз",
      description: "Риск паводка и время до критического уровня",
      tag: "модель",
      path: "/forecast",
      keywords: "прогноз forecast риск паводок критический тренд",
      icon: <AssessmentIcon />,
    },
    {
      kind: "route",
      label: "База данных",
      description: "Таблицы PostgreSQL и администрирование",
      tag: "admin",
      path: "/admin",
      keywords: "база данные admin postgresql таблицы crud",
      icon: <StorageIcon />,
    },
    {
      kind: "route",
      label: "Войти",
      description: "Панель авторизации оператора",
      tag: "доступ",
      path: "/login",
      keywords: "вход login авторизация оператор",
      icon: <LoginIcon />,
    },
  ]), []);

  async function load_alerts() {
    setIsLoading(true);
    try {
      const data = await get_alerts(8);
      setAlerts(data);
      setError("");
    } catch (err) {
      setError("API недоступен");
    } finally {
      setIsLoading(false);
    }
  }

  const load_search_stations = useCallback(async () => {
    if (isSearchLoading || searchStations.length > 0) return;

    setIsSearchLoading(true);
    try {
      const data = await get_latest_monitoring_stations();
      setSearchStations(data || []);
      setSearchError("");
    } catch (err) {
      setSearchError("API недоступен");
    } finally {
      setIsSearchLoading(false);
    }
  }, [isSearchLoading, searchStations.length]);

  const stationResults = useMemo(() => searchStations.map((station) => ({
    kind: "station",
    label: station.monitoring_station_name || station.station_code || station.sensor_id || "Гидропост",
    description: [
      station.water_body_name,
      station.settlement_name,
      station.station_code && `код ${station.station_code}`,
      station.sensor_id && `датчик ${station.sensor_id}`,
    ].filter(Boolean).join(" · "),
    path: station.sensor_id ? `/chart/${encodeURIComponent(station.sensor_id)}` : "/maps",
    keywords: [
      station.monitoring_station_name,
      station.station_code,
      station.sensor_id,
      station.water_body_name,
      station.settlement_name,
      station.district,
      station.water_level_status,
    ].filter(Boolean).join(" "),
    icon: <WaterIcon />,
    status: station.water_level_status,
    level: format_cm(station.water_level_cm),
  })), [searchStations]);

  const visibleSearchResults = useMemo(() => {
    const query = normalize_text(searchQuery);
    const allResults = [...routeResults, ...stationResults];

    if (!query) {
      return [
        ...routeResults.slice(0, 4),
        ...stationResults.slice(0, 4),
      ];
    }

    return allResults
      .filter((result) => normalize_text(`${result.label} ${result.description} ${result.keywords}`).includes(query))
      .slice(0, 8);
  }, [routeResults, searchQuery, stationResults]);

  const searchSignal = Math.min(100, Math.max(22, searchQuery.length * 14 + visibleSearchResults.length * 6));

  const open_search = useCallback(() => {
    setIsSearchOpen(true);
    load_search_stations();
  }, [load_search_stations]);

  const close_search = useCallback(() => {
    setIsSearchOpen(false);
    setActiveSearchIndex(0);
  }, []);

  function select_search_result(result) {
    if (!result) return;
    setSearchQuery("");
    close_search();
    navigate(result.path);
  }

  useEffect(() => {
    // Оповещения обновляются каждые 10 секунд независимо от главной страницы.
    load_alerts();
    const timer = setInterval(load_alerts, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Закрываем выпадающую панель, если пользователь кликнул вне нее.
    function handle_click(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsOpen(false);
      }

      if (searchRef.current && !searchRef.current.contains(event.target)) {
        close_search();
      }
    }

    document.addEventListener("mousedown", handle_click);
    return () => document.removeEventListener("mousedown", handle_click);
  }, [close_search]);

  useEffect(() => {
    function handle_shortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open_search();
        searchInputRef.current && searchInputRef.current.focus();
      }
    }

    window.addEventListener("keydown", handle_shortcut);
    return () => window.removeEventListener("keydown", handle_shortcut);
  }, [open_search]);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [searchQuery]);

  function handle_search_keydown(event) {
    if (event.key === "Escape") {
      close_search();
      return;
    }

    if (!isSearchOpen) {
      open_search();
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex((index) => (
        visibleSearchResults.length ? (index + 1) % visibleSearchResults.length : 0
      ));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex((index) => (
        visibleSearchResults.length ? (index - 1 + visibleSearchResults.length) % visibleSearchResults.length : 0
      ));
    }

    if (event.key === "Enter") {
      event.preventDefault();
      select_search_result(visibleSearchResults[activeSearchIndex] || visibleSearchResults[0]);
    }
  }

  return (
    <div className="navbar">
      <div className="wrapper">
        <div className={`search ${isSearchOpen ? "active" : ""}`} ref={searchRef}>
          <SearchOutlinedIcon className="searchIcon" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            placeholder="Поиск поста, реки, датчика..."
            aria-label="Поиск"
            onFocus={open_search}
            onClick={open_search}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handle_search_keydown}
          />
          {searchQuery && (
            <button
              type="button"
              className="searchClear"
              title="Очистить поиск"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current && searchInputRef.current.focus();
              }}
            >
              <CloseOutlinedIcon />
            </button>
          )}

          {isSearchOpen && (
            <div className="searchPanel">
              <div className="searchPanelHeader">
                <span>{searchQuery ? "Найдено" : "Радар HydroPulse"}</span>
                <b>{searchQuery ? `${visibleSearchResults.length} совп.` : `${searchStations.length} постов`}</b>
              </div>

              <div className="searchSignal" aria-hidden="true">
                <span style={{ width: `${searchSignal}%` }} />
              </div>

              <div className="searchResults">
                {visibleSearchResults.map((result, index) => (
                  <button
                    type="button"
                    key={`${result.kind}-${result.path}-${result.label}`}
                    className={`searchResult ${index === activeSearchIndex ? "selected" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveSearchIndex(index)}
                    onClick={() => select_search_result(result)}
                  >
                    <span className={`searchResultIcon ${result.kind}`}>{result.icon}</span>
                    <span className="searchResultText">
                      <b>{result.label}</b>
                      <small>{result.description}</small>
                    </span>
                    {result.kind === "station" ? (
                      <span className="searchStationMeta">
                        <StatusBadge status={result.status} />
                        <em>{result.level}</em>
                      </span>
                    ) : (
                      <span className="searchResultTag">{result.tag}</span>
                    )}
                  </button>
                ))}

                {isSearchLoading && <div className="searchState">Сканируем гидропосты...</div>}
                {!isSearchLoading && searchError && <div className="searchState error">{searchError}</div>}
                {!isSearchLoading && !searchError && visibleSearchResults.length === 0 && (
                  <div className="searchState">Совпадений нет</div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="items">
          <button type="button" className="item iconButton" title="Переключить тему" onClick={() => dispatch({ type: "TOGGLE" })}>
            <DarkModeOutlinedIcon className="icon" />
          </button>
          <div className="notificationWrap" ref={notificationRef}>
            <button
              type="button"
              className={`item iconButton notificationButton ${isOpen ? "active" : ""}`}
              title="Оповещения"
              onClick={() => setIsOpen((value) => !value)}
            >
              <NotificationsNoneOutlinedIcon className="icon" />
              {activeAlerts.length > 0 && <div className="counter">{activeAlerts.length}</div>}
            </button>

            {isOpen && (
              <div className="notificationPanel">
                <div className="notificationPanelHeader">
                  <div>
                    <b>Оповещения</b>
                    <span>{activeAlerts.length} активных</span>
                  </div>
                  <button type="button" onClick={load_alerts} disabled={isLoading} title="Обновить">
                    <RefreshOutlinedIcon />
                  </button>
                </div>

                {error && <div className="notificationState error">{error}</div>}
                {!error && activeAlerts.length === 0 && <div className="notificationState">Активных тревог нет</div>}
                {!error && activeAlerts.map((alert) => (
                  <div className="notificationItem" key={alert.id}>
                    <div>
                      <b>{alert.monitoring_station_name || "Гидропост"}</b>
                      <p>{alert.message}</p>
                      <small>{format_time(alert.created_at)}</small>
                    </div>
                    <StatusBadge status={alert.alert_type} />
                  </div>
                ))}
              </div>
            )}
          </div>
          {user ? (
            <button type="button" className="item authTopButton" title="Выйти" onClick={logout}>
              <LogoutIcon className="icon" />
              <span>{user.username}</span>
            </button>
          ) : (
            <button type="button" className="item authTopButton" title="Войти" onClick={() => navigate("/login")}>
              <LoginIcon className="icon" />
              <span>Войти</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
