import Sidebar from "../../components/sidebar/Sidebar";
import Navbar from "../../components/navbar/Navbar";
import SChart from "../../components/chart/Chart";
import Forecast from "../../components/forecast/ForecastChart";
import "./forecast.scss";

const Reporter = () => {
    return (
        <div className="forecast">
            <Sidebar />
            <div className="forecastContainer">
                <Navbar />
                <h2>Данные за прошедший день</h2>
                <div className="charts"  >
                    <SChart />
                </div>
                <h2>Прогнозирование данных</h2>
                <div className="charts"  >
                    <Forecast />
                </div>
            </div>
        </div>
    );
};

export default Reporter;