import "./sidebar.scss";
import { Link } from "react-router-dom";
import { DarkModeContext } from "../../context/darkModeContext";
import { useContext } from "react";
import HomeIcon from '@mui/icons-material/Home';
import MapIcon from '@mui/icons-material/Map';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AssessmentIcon from '@mui/icons-material/Assessment';

const Sidebar = () => {






  const { dispatch } = useContext(DarkModeContext);
  return (
    <div className="sidebar">
      <div className="top">
        <Link to="/" style={{ textDecoration: "none" }}>
          <span className="logo">WaterLevel</span>
        </Link>
      </div>


      <hr />
      <div className="center">
        <ul>
          <Link to="/" style={{ textDecoration: "none" }}>
          <li>
            <HomeIcon className="icon" />
            <span>Главная</span>
          </li>
          </Link>
          <Link to="/maps" style={{ textDecoration: "none" }}>
            <li>
              <MapIcon className="icon" />
              <span>Карта</span>
            </li>
          </Link>
          <Link to="/chart/001" style={{ textDecoration: "none" }}>
            <li>
              <ShowChartIcon className="icon" />
              <span>Графики</span>
            </li>
          </Link>
          <Link to="/forecast" style={{ textDecoration: "none" }}>
          <li>
            <AssessmentIcon className="icon" />
            <span>Прогноз</span>
          </li>
          </Link>
          

        </ul>
      </div>
      <div className="bottom">
        <div
          className="colorOption"
          onClick={() => dispatch({ type: "LIGHT" })}
        ></div>
        <div
          className="colorOption"
          onClick={() => dispatch({ type: "DARK" })}
        ></div>
      </div>
    </div>
  );
};

export default Sidebar;
