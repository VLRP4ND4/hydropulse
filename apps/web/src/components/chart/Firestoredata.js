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
        //console.log('\nArray:', JSON.stringify(data));
        return data;
    } catch (err) {
        console.error(err);
    }
}