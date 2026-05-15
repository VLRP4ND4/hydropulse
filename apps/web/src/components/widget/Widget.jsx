import "./widget.scss";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import WaterIcon from '@mui/icons-material/Water';
import ReportIcon from '@mui/icons-material/Report';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import DifferenceIcon from '@mui/icons-material/Difference';
import {useObject} from "react-firebase-hooks/database";
import {ref} from "firebase/database";
import {db} from "../../firebase";


const Widget = ({ type }) => {
  let data;
  const [levelwater001] = useObject(ref(db, 'id/001/levelwater'));
  const [levelcrit001] = useObject(ref(db, 'id/001/levelcrit'));
  const [lat001] = useObject(ref(db, 'id/001/lat'));
  const [lon001] = useObject(ref(db, 'id/001/lng'));
  const [title001] = useObject(ref(db, 'id/001/title'));


  const [levelwater002] = useObject(ref(db, 'id/002/levelwater'));
  const [levelcrit002] = useObject(ref(db, 'id/002/levelcrit'));
  const [lat002] = useObject(ref(db, 'id/002/lat'));
  const [lon002] = useObject(ref(db, 'id/002/lng'));
  const [title002] = useObject(ref(db, 'id/002/title'));

  const [levelwater003] = useObject(ref(db, 'id/003/levelwater'));
  const [levelcrit003] = useObject(ref(db, 'id/003/levelcrit'));
  const [lat003] = useObject(ref(db, 'id/003/lat'));
  const [lon003] = useObject(ref(db, 'id/003/lng'));
  const [title003] = useObject(ref(db, 'id/003/title'));

  const [levelwater004] = useObject(ref(db, 'id/004/levelwater'));
  const [levelcrit004] = useObject(ref(db, 'id/004/levelcrit'));
  const [lat004] = useObject(ref(db, 'id/004/lat'));
  const [lon004] = useObject(ref(db, 'id/004/lng'));
  const [title004] = useObject(ref(db, 'id/004/title'));

  //temporary
  
  const diff = 20;
  
  function checkStatus(level, critical){
    var status;
    if(level<critical){
      status = "Нормальный";
    } else {
      status = "Критический";
    }
    return status
  }

  switch (type) {
    case "user":
      data = {
        title: "Уровень воды",
        datal: levelwater001 && levelwater001.val(), 
        isMoney: false,
        // link: "See all users",
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
        datal: levelcrit001 && levelcrit001.val(), 
        isMoney: false,
        // link: "View all orders",
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
        datal: ((levelcrit001 && levelcrit001.val()) - (levelwater001 && levelwater001.val())),  
        isMoney: true,
        // link: "View net earnings",
        icon: (
          <DifferenceIcon
            className="icon"
            style={{ backgroundColor: "rgba(0, 128, 0, 0.2)", color: "green" }}
          />
        ),
      };
      break;
    case "balance":
      data = {
        title: "Статус",
        datal: checkStatus((levelwater001 && levelwater001.val()),(levelcrit001 && levelcrit001.val())), 
        isMoney: true,
        // link: "See details",
        icon: (
          <QuestionMarkIcon
            className="icon"
            style={{
              backgroundColor: "rgba(252, 252, 225, 1)",
              color: "yellow",
            }}
          />
        ),
      };
      break;
    default:
      break;
  }

  return (
    <div className="widget">
      <div className="left">
        <span className="title">{data.title}</span>
        <span className="counter">
         {data.datal}
        </span>
        <span className="link">{data.link}</span>
      </div>
      <div className="right">
        {/* <div className="percentage positive">
          <KeyboardArrowUpIcon />
          {diff} %
        </div> */}
        {data.icon}
      </div>
    </div>
  );
};

export default Widget;
