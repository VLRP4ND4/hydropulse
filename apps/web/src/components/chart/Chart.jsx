import "./chart.scss";
import React, {useState, useEffect} from 'react';
import { Line } from "react-chartjs-2";
import {Chart as ChartJS} from 'chart.js/auto'; 
import {getData} from './Firestoredata'

const SChart = () => {

  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getData();
      setData(data);
      console.log(data.map((data) => data.levelwater))
    };
    fetchData();
  }, []);

  const datalevel = {
    labels: data.map((data) => data.hour),
    datasets: [{
      label: 'Уровень воды',
      data: data.map((data) => data.levelwater),
      fill: true,
      borderColor: 'aqua',
      backgroundColor:'aqua',
      tension: 0.1
    }
    ]
  }
  const chartOptions = {
    maintainAspectRatio: false,
    // ... other chart options configuration ...
  };
  return (
    <div className="achart" >
          <Line data={datalevel} options={chartOptions} />
    </div>
  );
};

export default SChart;