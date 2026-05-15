import Sidebar from "../../components/sidebar/Sidebar";
import Navbar from "../../components/navbar/Navbar";
import "./map.scss";
import Widget from "../../components/widget/Widget";
import Featured from "../../components/featured/Featured";
import GMap from "../../components/map/GMap"
import { useJsApiLoader } from "@react-google-maps/api"

// const API_KEY = process.env.REACT_APP_API_KEY;
// console.log(API_KEY);
const defaultcenter = {
    lat: 63.57281,
    lng: 125.21271
};

const libraries = ['places']



const Map = () => {

    <h1>asasdas</h1>
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "AIzaSyDxryCDzCUI83btSdAZBXymi847H38h2xk"

    })
    return (
        <div className="map">
            <Sidebar />
            <div className="mapContainer">
                <Navbar />
                <div className="charts">
                    {isLoaded ? <GMap title="Карта мониторинга паводков" center={defaultcenter} style="height: 100%"/> : <h2>Loading</h2>}
                </div>
            </div>
        </div>
    );
};

export default Map;
