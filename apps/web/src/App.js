import Home from "./pages/home/Home";
import Map from "./pages/map/Map";
import Chart from "./pages/chart/Chart"
import Forecast from "./pages/forecast/Forecast"
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./style/dark.scss";
import { useContext } from "react";
import { DarkModeContext } from "./context/darkModeContext";

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
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;