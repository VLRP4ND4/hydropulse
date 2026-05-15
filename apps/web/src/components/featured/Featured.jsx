import "./featured.scss";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpOutlinedIcon from "@mui/icons-material/KeyboardArrowUpOutlined";
import {useObject} from "react-firebase-hooks/database";
import {ref} from "firebase/database";
import {db} from "../../firebase";



const Featured = () => {
  const [levelwater001] = useObject(ref(db, 'id/001/levelwater')); //в данном случае посредством функцией val() мы можем получить значение из указанной ссылки при этом компонент будет обновляться при изменении значения в БД
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

  function percentLevel(level, critical){
    const percent = (level*100)/critical;
    return percent
  }
  function checkStatus(level, critical){
    var status;
    if(level<critical){
      status = "Нормальный";
    } else {
      status = "Критический";
    }
    return status
  }

  return (
    <div className="featured">
      <div className="top">
        <h1 className="title">Статус паводковой ситуации</h1>
        <MoreVertIcon fontSize="small" />
      </div>
      <div className="bottom">
        <div className="featuredChart">
          <CircularProgressbar value={percentLevel(parseFloat(levelwater001 && levelwater001.val()), parseFloat(levelcrit001 && levelcrit001.val()))} text={percentLevel(parseFloat(levelwater001 && levelwater001.val()), parseFloat(levelcrit001 && levelcrit001.val())) + "%"} strokeWidth={10} />
        </div>
        <p className="title">Локация: {title001&&title001.val()}</p>
        <p className="amount">{levelwater001&&levelwater001.val() + " см"}</p>
        <p className="desc">
          Местоположение выбрано по умолчанию
        </p>
        <div className="summary">
          <div className="item">
            <div className="itemTitle">Прогноз</div>
            <div className="itemResult negative">
              <KeyboardArrowDownIcon fontSize="small"/>
              <div className="resultAmount">7 дней</div>
            </div>
          </div>
          <div className="item">
            <div className="itemTitle">Подъем</div>
            <div className="itemResult positive">
              <KeyboardArrowUpOutlinedIcon fontSize="small"/>
              <div className="resultAmount">55 см</div>
            </div>
          </div>
          <div className="item">
            <div className="itemTitle">Ожидается</div>
            <div className="itemResult positive">
              <KeyboardArrowUpOutlinedIcon fontSize="small"/>
              <div className="resultAmount">18 см</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Featured;
