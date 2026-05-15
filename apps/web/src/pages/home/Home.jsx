import Sidebar from "../../components/sidebar/Sidebar";
import Navbar from "../../components/navbar/Navbar";
import "./home.scss";
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



const Home = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyDxryCDzCUI83btSdAZBXymi847H38h2xk"

  })
  return (
    <div className="home">
      <Sidebar />
      <div className="homeContainer">
        <Navbar />
        <div className="widgets">
          <Widget type="user" />
          <Widget type="order" />
          <Widget type="earning" />
          <Widget type="balance" />
        </div>
        <div className="charts">
          <Featured />
          {isLoaded ? <GMap title="Карта мониторинга паводков" center={defaultcenter}/> : <h2>Loading</h2>}

        </div>
      </div>
    </div>
  );
};

export default Home;
