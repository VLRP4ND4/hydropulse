import React, {useRef, useState, useEffect } from 'react';
import "./gmap.scss";
import {GoogleMap, Marker, InfoWindow, LoadScript} from "@react-google-maps/api";
import { db } from "../../firebase";
import {ref} from 'firebase/database';
import { useObject } from 'react-firebase-hooks/database';

const containerStyle = {
    width: '100%',
    height: '100%'
};

const center = {
    lat:  41.4055,
    lng: 2.1
};

const GMap = ({ title, center }) => {
    var MarkerID = 0;
    //чтение данных с Realtime Database с использование react hooks добавляющие логику с отслеживанием состояния(т.е при изменении значения на странице обновляется компонент)
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

    const [levelwater005] = useObject(ref(db, 'id/005/levelwater'));
    const [levelcrit005] = useObject(ref(db, 'id/005/levelcrit'));
    const [lat005] = useObject(ref(db, 'id/005/lat'));
    const [lon005] = useObject(ref(db, 'id/005/lng'));
    const [title005] = useObject(ref(db, 'id/005/title'));

    //здесь указан json массив в котором хранятся данные о метках: название местоположения координаты уровень воды, критический уровень которые берутся из БД Firebase
    const locations = [
        {
            name: title001 && title001.val(),
            location: {
                lat: lat001 && lat001.val(),
                lng: lon001 && lon001.val()
            },
            levelwater: levelwater001 && levelwater001.val(),
            levelcrit: levelcrit001 && levelcrit001.val(),
        },
        {
            name: title002 && title002.val(),
            location: {
                lat: lat002 && lat002.val(),
                lng: lon002 && lon002.val()
            },
            levelwater: levelwater002 && levelwater002.val(),
            levelcrit: levelcrit002 && levelcrit002.val(),
        },
        {
            name: title003 && title003.val(),
            location: {
                lat: lat003 && lat003.val(),
                lng: lon003 && lon003.val()
            },
            levelwater: levelwater003 && levelwater003.val(),
            levelcrit: levelcrit003 && levelcrit003.val(),

        },
        {
            name: title004 && title004.val(),
            location: {
                lat: lat004 && lat004.val(),
                lng: lon004 && lon004.val()
            },
            levelwater: levelwater004 && levelwater004.val(),
            levelcrit: levelcrit004 && levelcrit004.val(),
        },
        {
            name: title005 && title005.val(),
            location: {
                lat: lat005 && lat005.val(),
                lng: lon005 && lon005.val()
            },
            levelwater: levelwater005 && levelwater005.val(),
            levelcrit: levelcrit005 && levelcrit005.val(),
        }
    ];


    const [ selected, setSelected ] = useState({});
    const onSelect = item => {
        setSelected(item);
    }
    const mapRef = React.useRef(undefined)
    const onLoad = React.useCallback(function callback(map) {
        mapRef.current = map;
    }, [])
    const onUnmount = React.useCallback(function callback(map) {
        mapRef.current = undefined;
    }, [])

    function checkStatus(level, critical){
        var status;
        if(level<critical){
            status = "Нормально";
        } else {
            status = "Критический";
        }
        return status
    }

    //рендеринг компонента
    return (

        <div className="GMap">

            {/*<div className="title">{title}</div>*/}
            {/*<h1>{checkStatus(parseFloat(levelwater001 && levelwater001.val()), parseFloat(levelcrit001 && levelcrit001.val()))}</h1>*/}
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={6}
                onLoad={onLoad}
                onUnmount={onUnmount}>
                {
                    locations.map(item => {
                        return (
                            <Marker key={item.name}
                                    position={item.location}
                                    onClick={() => onSelect(item)}
                            />
                        )
                    })
                }
                {
                    selected.location &&
                    (
                        <InfoWindow
                            position={selected.location}
                            clickable={true}
                            onCloseClick={() => setSelected({})}
                        >
                            <p><h4>{selected.name}</h4>
                                <span>Уровень воды: {selected.levelwater}</span><br></br>
                                <span>Критический уровень: {selected.levelcrit}</span>

                            </p>
                        </InfoWindow>
                    )
                }




            </GoogleMap>
        </div>
    );
};


// function readData(pathVal1, pathVal2){
//     var value;
//     const starCountRef = ref(db, `id/${pathVal1}/${pathVal2}`);
//     onValue(starCountRef, (snapshot) => {
//         value = snapshot.val();
//     });
//     console.log(value);
//     return value;
// }

/*<Marker*/
/*    icon={"https://icons8.com/icon/55036/leaving-geo-fence"}*/
/*    position={markersLocation[1]}*/
/*/>*/
export default GMap;