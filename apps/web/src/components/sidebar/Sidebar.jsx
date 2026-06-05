import "./sidebar.scss";
import { Link, NavLink } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import MapIcon from "@mui/icons-material/Map";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AssessmentIcon from "@mui/icons-material/Assessment";
import WaterIcon from "@mui/icons-material/Water";
import StorageIcon from "@mui/icons-material/Storage";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import { useEffect, useState } from "react";

const SIDEBAR_COLLAPSED_KEY = "hydropulse_sidebar_collapsed";

// Боковое меню держит основную навигацию.
const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Список пунктов вынесен в массив, чтобы добавление нового раздела было одной строкой.
  const nav_items = [
    { to: "/", label: "Главная", icon: <HomeIcon className="icon" /> },
    { to: "/maps", label: "Карта", icon: <MapIcon className="icon" /> },
    { to: "/chart/001", label: "Графики", icon: <ShowChartIcon className="icon" /> },
    { to: "/forecast", label: "Прогноз", icon: <AssessmentIcon className="icon" /> },
    { to: "/admin", label: "База данных", icon: <StorageIcon className="icon" /> },
  ];

  return (
    <div className={isCollapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="top">
        <Link to="/" style={{ textDecoration: "none" }}>
          <span className="logo"><WaterIcon /> HydroPulse</span>
        </Link>
        <button
          type="button"
          className="sidebarToggle"
          title={isCollapsed ? "Развернуть навигацию" : "Свернуть навигацию"}
          onClick={() => setIsCollapsed((value) => !value)}
        >
          {isCollapsed ? <MenuIcon /> : <MenuOpenIcon />}
        </button>
      </div>

      <hr />

      <div className="center">
        <p className="sectionTitle">Навигация</p>
        <ul>
          {nav_items.map((item) => (
            <NavLink key={item.to} to={item.to} style={{ textDecoration: "none" }}>
              <li>
                {item.icon}
                <span>{item.label}</span>
              </li>
            </NavLink>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
