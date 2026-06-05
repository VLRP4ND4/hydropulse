import Home from "./pages/home/Home";
import Map from "./pages/map/Map";
import Chart from "./pages/chart/Chart"
import Forecast from "./pages/forecast/Forecast"
import Admin from "./pages/admin/Admin";
import Login from "./pages/login/Login";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./style/dark.scss";
import { useContext } from "react";
import { DarkModeContext } from "./context/darkModeContext";

// Корневой компонент задает маршруты приложения и общий класс темной темы.
// Все страницы подключаются через React Router, поэтому URL напрямую отражает раздел системы.
function App() {
  const { darkMode } = useContext(DarkModeContext);

  return (
    <div className={darkMode ? "app dark" : "app"}>
      <BrowserRouter>
        <Routes>
          <Route path="/">
            <Route index element={<Home />} />
            <Route path="maps">
              <Route index element={<Map />} />
            </Route>
            <Route path="chart/:id">
              <Route index element={<Chart />} />
            </Route>
            <Route path="forecast">
              <Route index element={<Forecast />} />
            </Route>
            <Route path="admin">
              <Route index element={<Admin />} />
            </Route>
            <Route path="login">
              <Route index element={<Login />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
