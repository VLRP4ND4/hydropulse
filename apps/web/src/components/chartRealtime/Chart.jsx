import "./chart.scss";
import React, {useState, useEffect} from 'react';
import { Line } from "react-chartjs-2";
import {Chart as ChartJS} from 'chart.js/auto';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { useParams } from 'react-router-dom';
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

const SChart = () => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const { id } = useParams();
    console.log(id)
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [
            {
                label: 'Level Water',
                data: [],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'aqua',
                borderWidth: 1,
                fill: true,
            },
            {
                label: 'Critical Level',
                data: [],
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                backgroundColor: 'pink',
                fill: true,
            },
        ],});

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            fetchData();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = () => {
        onValue(ref(db, `id/${id}`), (snapshot) => {
            const data = snapshot.val();
            const levelWater = data.levelwater;
            const levelCrit = data.levelcrit;
            const time = new Date().toLocaleTimeString();
            setChartData((prevChartData) => {
                const newLabels = [...prevChartData.labels, time];
                const newDatasets = prevChartData.datasets.map((dataset) => {
                    if (dataset.label === 'Level Water') {
                        const newData = [...dataset.data, levelWater];
                        return { ...dataset, data: newData };
                    } else if (dataset.label === 'Critical Level') {
                        const newData = [...dataset.data, levelCrit];
                        return { ...dataset, data: newData };
                    }
                    return dataset;
                });
                return { labels: newLabels, datasets: newDatasets };
            });
        });
    };
    const chartOptions = {
        maintainAspectRatio: false,
        // ... other chart options configuration ...
        scales: {
          y: { // defining min and max so hiding the dataset does not change scale range
            min: 0
          }
        }
      };

    return (
        <div className="achart" >
            <Line data={chartData} options={chartOptions}/>
        </div>
    );
};

export default SChart;