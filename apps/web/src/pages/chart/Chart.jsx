import Sidebar from "../../components/sidebar/Sidebar";
import Navbar from "../../components/navbar/Navbar";
import SChart from "../../components/chart/Chart";
import SChartRealtime from "../../components/chartRealtime/Chart";
import "./chart.scss";
const Chart = () => {
    return (
        <div className="chart">
            <Sidebar />
            <div className="chartContainer">
                <Navbar />
                <div className="charts"  >
                    <SChart />
                </div>
                <div className="charts"  >
                    <SChartRealtime />
                </div>
            </div>
        </div>
    );
};

export default Chart;