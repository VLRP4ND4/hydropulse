// import "./widget.scss";
// import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
// import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
// import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
// import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
// import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
// import WaterIcon from '@mui/icons-material/Water';
// import ReportIcon from '@mui/icons-material/Report';
// import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
// import DifferenceIcon from '@mui/icons-material/Difference';
// import {useObject} from "react-firebase-hooks/database";
// import {ref} from "firebase/database";
// import {db} from "../../firebase";


// const Widget = ({ type }) => {
//   let data;
//   const [levelwater001] = useObject(ref(db, 'id/001/levelwater'));
//   const [levelcrit001] = useObject(ref(db, 'id/001/levelcrit'));
//   const [lat001] = useObject(ref(db, 'id/001/lat'));
//   const [lon001] = useObject(ref(db, 'id/001/lng'));
//   const [title001] = useObject(ref(db, 'id/001/title'));


//   const [levelwater002] = useObject(ref(db, 'id/002/levelwater'));
//   const [levelcrit002] = useObject(ref(db, 'id/002/levelcrit'));
//   const [lat002] = useObject(ref(db, 'id/002/lat'));
//   const [lon002] = useObject(ref(db, 'id/002/lng'));
//   const [title002] = useObject(ref(db, 'id/002/title'));

//   const [levelwater003] = useObject(ref(db, 'id/003/levelwater'));
//   const [levelcrit003] = useObject(ref(db, 'id/003/levelcrit'));
//   const [lat003] = useObject(ref(db, 'id/003/lat'));
//   const [lon003] = useObject(ref(db, 'id/003/lng'));
//   const [title003] = useObject(ref(db, 'id/003/title'));

//   const [levelwater004] = useObject(ref(db, 'id/004/levelwater'));
//   const [levelcrit004] = useObject(ref(db, 'id/004/levelcrit'));
//   const [lat004] = useObject(ref(db, 'id/004/lat'));
//   const [lon004] = useObject(ref(db, 'id/004/lng'));
//   const [title004] = useObject(ref(db, 'id/004/title'));

//   //temporary
  
//   const diff = 20;
  
//   function checkStatus(level, critical){
//     var status;
//     if(level<critical){
//       status = "Нормальный";
//     } else {
//       status = "Критический";
//     }
//     return status
//   }

//   switch (type) {
//     case "user":
//       data = {
//         title: "Уровень воды",
//         datal: levelwater001 && levelwater001.val(), 
//         isMoney: false,
//         // link: "See all users",
//         icon: (
//           <WaterIcon
//             className="icon"
//             style={{
//               color: "blue",
//               backgroundColor: "rgba(226, 225, 252, 1)",
//             }}
//           />
//         ),
//       };
//       break;
//     case "order":
//       data = {
//         title: "Критический уровень",
//         datal: levelcrit001 && levelcrit001.val(), 
//         isMoney: false,
//         // link: "View all orders",
//         icon: (
//           <ReportIcon
//             className="icon"
//             style={{
//               backgroundColor: "rgba(255, 199, 199, 1)",
//               color: "red",
//             }}
//           />
//         ),
//       };
//       break;
//     case "earning":
//       data = {
//         title: "До критического уровня",
//         datal: ((levelcrit001 && levelcrit001.val()) - (levelwater001 && levelwater001.val())),  
//         isMoney: true,
//         // link: "View net earnings",
//         icon: (
//           <DifferenceIcon
//             className="icon"
//             style={{ backgroundColor: "rgba(0, 128, 0, 0.2)", color: "green" }}
//           />
//         ),
//       };
//       break;
//     case "balance":
//       data = {
//         title: "Статус",
//         datal: checkStatus((levelwater001 && levelwater001.val()),(levelcrit001 && levelcrit001.val())), 
//         isMoney: true,
//         // link: "See details",
//         icon: (
//           <QuestionMarkIcon
//             className="icon"
//             style={{
//               backgroundColor: "rgba(252, 252, 225, 1)",
//               color: "yellow",
//             }}
//           />
//         ),
//       };
//       break;
//     default:
//       break;
//   }

//   return (
//     <div className="widget">
//       <div className="left">
//         <span className="title">{data.title}</span>
//         <span className="counter">
//          {data.datal}
//         </span>
//         <span className="link">{data.link}</span>
//       </div>
//       <div className="right">
//         {/* <div className="percentage positive">
//           <KeyboardArrowUpIcon />
//           {diff} %
//         </div> */}
//         {data.icon}
//       </div>
//     </div>
//   );
// };

// export default Widget;




import "./widget.scss";
import WaterIcon from "@mui/icons-material/Water";
import ReportIcon from "@mui/icons-material/Report";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import DifferenceIcon from "@mui/icons-material/Difference";
import { useEffect, useState } from "react";
import { get_latest_monitoring_stations } from "../../api/hydropulse_api";

const Widget = ({ type }) => {
  const [station, set_station] = useState(null);
  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState(null);

  useEffect(() => {
    async function load_data() {
      try {
        const data = await get_latest_monitoring_stations();

        set_station(data[0] || null);
        set_error(null);
      } catch (error) {
        console.error(error);
        set_error("Ошибка загрузки данных");
      } finally {
        set_is_loading(false);
      }
    }

    load_data();

    const interval_id = setInterval(load_data, 5000);

    return () => clearInterval(interval_id);
  }, []);

  if (is_loading) {
    return <div className="widget">Загрузка...</div>;
  }

  if (error) {
    return <div className="widget">{error}</div>;
  }

  if (!station) {
    return <div className="widget">Нет данных</div>;
  }

  const water_level_cm = station.water_level_cm;
  const distance_cm = station.distance_cm;
  const danger_level_cm = station.danger_level_cm;
  const critical_level_cm = station.critical_level_cm;

  function format_cm(value) {
    if (value === null || value === undefined) {
      return "Нет данных";
    }

    return `${Number(value).toFixed(1)} см`;
  }

  function get_status() {
    if (water_level_cm === null || water_level_cm === undefined) {
      return "Нет данных";
    }

    if (
      critical_level_cm !== null &&
      critical_level_cm !== undefined &&
      water_level_cm >= critical_level_cm
    ) {
      return "Критический";
    }

    if (
      danger_level_cm !== null &&
      danger_level_cm !== undefined &&
      water_level_cm >= danger_level_cm
    ) {
      return "Опасный";
    }

    return "Нормальный";
  }

  function get_difference_to_critical() {
    if (
      water_level_cm === null ||
      water_level_cm === undefined ||
      critical_level_cm === null ||
      critical_level_cm === undefined
    ) {
      return "Нет данных";
    }

    return `${Number(critical_level_cm - water_level_cm).toFixed(1)} см`;
  }

  let data;

  switch (type) {
    case "user":
      data = {
        title: "Уровень воды",
        value: format_cm(water_level_cm),
        link: station.monitoring_station_name,
        icon: (
          <WaterIcon
            className="icon"
            style={{
              color: "blue",
              backgroundColor: "rgba(226, 225, 252, 1)",
            }}
          />
        ),
      };
      break;

    case "order":
      data = {
        title: "Критический уровень",
        value: format_cm(critical_level_cm),
        link: station.water_body_name,
        icon: (
          <ReportIcon
            className="icon"
            style={{
              backgroundColor: "rgba(255, 199, 199, 1)",
              color: "red",
            }}
          />
        ),
      };
      break;

    case "earning":
      data = {
        title: "До критического уровня",
        value: get_difference_to_critical(),
        link: `Расстояние до воды: ${format_cm(distance_cm)}`,
        icon: (
          <DifferenceIcon
            className="icon"
            style={{
              backgroundColor: "rgba(0, 128, 0, 0.2)",
              color: "green",
            }}
          />
        ),
      };
      break;

    case "balance":
      data = {
        title: "Статус",
        value: get_status(),
        link: station.settlement_name || "Населённый пункт не указан",
        icon: (
          <QuestionMarkIcon
            className="icon"
            style={{
              backgroundColor: "rgba(252, 252, 225, 1)",
              color: "orange",
            }}
          />
        ),
      };
      break;

    default:
      data = {
        title: "Нет данных",
        value: "-",
        link: "",
        icon: null,
      };
  }

  return (
    <div className="widget">
      <div className="left">
        <span className="title">{data.title}</span>
        <span className="counter">{data.value}</span>
        <span className="link">{data.link}</span>
      </div>

      <div className="right">{data.icon}</div>
    </div>
  );
};

export default Widget;