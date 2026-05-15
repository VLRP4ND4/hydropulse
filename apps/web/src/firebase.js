// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);