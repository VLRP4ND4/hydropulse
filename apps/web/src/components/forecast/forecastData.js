const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('@firebase/firestore');



export const getData = async ()=>{
    const firebaseConfig = {
        apiKey: "AIzaSyDfX8YLG6awBTxezP_5fH6hpRGXOGkJmZ8",
        authDomain: "level-water-b7b74.firebaseapp.com",
        databaseURL: "https://level-water-b7b74-default-rtdb.firebaseio.com",
        projectId: "level-water-b7b74",
        storageBucket: "level-water-b7b74.appspot.com",
        messagingSenderId: "437701271434",
        appId: "1:437701271434:web:ebbeeab5b2d577bb557273",
        measurementId: "G-BEXN3CZFCQ"
    };
    const app1 = initializeApp(firebaseConfig);

    const db = getFirestore(app1);
    const collectionRef = collection(db, '0002/202303/1');
    try {
        // Query all documents in the collection
        const snapshot = await getDocs(collectionRef);
        const UTC = 9;

        const data = snapshot.docs.map(doc => {
            const { levelwater, time } = doc.data();
            const timeObj = time instanceof Date ? time : time.toDate(); // проверить, является ли time объектом Date, преобразовать в Date, если нет
            timeObj.setUTCHours(timeObj.getUTCHours() + UTC); // добавить 9 часов для преобразования в часовой пояс UTC+9
            const hour = timeObj.getUTCHours(); // get the hour in UTC+9 time zone
            return { levelwater, hour, time };//получить час в часовом поясе UTC+9
        });

        data.sort((a, b) => a.time - b.time);

        let night1Array = []
        let morningArray = []
        let noonArray = []
        let night2Array = []

        for (let i=0 ;i<=data.length-1; i++) {
            
            const hours = data[i].hour

            if(0 <= parseInt(hours) && parseInt(hours) <= 5){
                night1Array.push(data[i]);
            }

            else if(6 <= parseInt(hours) && parseInt(hours) <= 11){
                morningArray.push(data[i]);
            }

            else if(12 <= parseInt(hours) && parseInt(hours) <= 17){
                noonArray.push(data[i])
            }
            
            else if((18 <= parseInt(hours) && parseInt(hours) <= 23) || (0 <= parseInt(hours) && parseInt(hours) <= 5)){
                night2Array.push(data[i])
            }
        };
        
        const getAverageSpeed = (level) => {
            let k = 0;
            let countPoint = 0;
            for (let i = (level.length-1); i > 0; i -= 1) {
                k += ((level[i].levelwater - level[i-1].levelwater))
                countPoint += 1
            }
            return (k/countPoint)
        }

        let night1AverageSpeed = (getAverageSpeed(night1Array))
        let morningAverageSpeed = (getAverageSpeed(morningArray))
        let noonAverageSpeed = (getAverageSpeed(noonArray))
        let night2AverageSpeed = (getAverageSpeed(night2Array))

        // последнее значение
        let lastLevelWater = night2Array[night2Array.length-1].levelwater
        // console.log(lastLevelWater)
        
        // копия 
        const predictArray = data.slice();
        // console.log(predictArray)
        for (let i = 0; i < predictArray.length; i += 1) {
            if (0 == predictArray[i].hour) {
                predictArray[i].levelwater = lastLevelWater + night1AverageSpeed 
            }
            else if (1 <= predictArray[i].hour && predictArray[i].hour <= 5) {
                predictArray[i].levelwater = predictArray[i-1].levelwater + night1AverageSpeed
            }
            else if (6 <= predictArray[i].hour && predictArray[i].hour <= 11) {
                predictArray[i].levelwater = predictArray[i-1].levelwater + morningAverageSpeed
            }
            else if (12 <= predictArray[i].hour && predictArray[i].hour <= 17) {
                predictArray[i].levelwater = predictArray[i-1].levelwater + noonAverageSpeed
            }
            else if (18 <= predictArray[i].hour && predictArray[i].hour <= 23) {
                predictArray[i].levelwater = predictArray[i-1].levelwater + night2AverageSpeed
            }    
        }

        console.log(data) 
        console.log(predictArray) 
        return predictArray;
    } catch (err) {
        console.error(err);
    }
}