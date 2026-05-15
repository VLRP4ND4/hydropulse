// import "./chart.scss";
// import React, {useState, useEffect} from 'react';
// import { Line } from "react-chartjs-2";
// import {Chart as ChartJS} from 'chart.js/auto'; 
// import {getData} from './Firestoredata'

// const SChart = () => {

//   const [data, setData] = useState([]);

//   useEffect(() => {
//     const fetchData = async () => {
//       const data = await getData();
//       setData(data);
//       console.log(data.map((data) => data.levelwater))
//     };
//     fetchData();
//   }, []);

//   const datalevel = {
//     labels: data.map((data) => data.hour),
//     datasets: [{
//       label: 'Уровень воды',
//       data: data.map((data) => data.levelwater),
//       fill: true,
//       borderColor: 'aqua',
//       backgroundColor:'aqua',
//       tension: 0.1
//     }
//     ]
//   }
//   const chartOptions = {
//     maintainAspectRatio: false,
//     // ... other chart options configuration ...
//   };
//   return (
//     <div className="achart" >
//           <Line data={datalevel} options={chartOptions} />
//     </div>
//   );
// };

// export default SChart;



import "./chart.scss";
import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS } from "chart.js/auto";
import { useParams } from "react-router-dom";
import { get_water_level_measurements } from "../../api/hydropulse_api";

const SChart = () => {
  const { id } = useParams();

  const [chart_data, set_chart_data] = useState({
    labels: [],
    datasets: [
      {
        label: "Уровень воды",
        data: [],
        borderWidth: 1,
        fill: true,
      },
      {
        label: "Расстояние до воды",
        data: [],
        borderWidth: 1,
        fill: true,
      },
    ],
  });

  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState(null);

  useEffect(() => {
    async function load_data() {
      try {
        const measurements = await get_water_level_measurements(id, 24);

        set_chart_data({
          labels: measurements.map((item) =>
            new Date(item.measured_at).toLocaleTimeString()
          ),
          datasets: [
            {
              label: "Уровень воды",
              data: measurements.map((item) => item.water_level_cm),
              borderWidth: 1,
              fill: true,
            },
            {
              label: "Расстояние до воды",
              data: measurements.map((item) => item.distance_cm),
              borderWidth: 1,
              fill: true,
            },
          ],
        });

        set_error(null);
      } catch (error) {
        console.error(error);
        set_error("Ошибка загрузки графика");
      } finally {
        set_is_loading(false);
      }
    }

    load_data();

    const interval_id = setInterval(load_data, 5000);

    return () => clearInterval(interval_id);
  }, [id]);

  const chart_options = {
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
      },
    },
  };

  if (is_loading) {
    return <div className="achart">Загрузка графика...</div>;
  }

  if (error) {
    return <div className="achart">{error}</div>;
  }

  return (
    <div className="achart">
      <Line data={chart_data} options={chart_options} />
    </div>
  );
};

export default SChart;