const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

async function request_json(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`);
  }

  return response.json();
}

export function get_latest_monitoring_stations() {
  return request_json(`${API_URL}/api/monitoring_stations/latest`);
}

export function get_water_level_measurements(sensor_id, hours = 24) {
  return request_json(
    `${API_URL}/api/water_level_measurements/${sensor_id}?hours=${hours}`
  );
}

export function get_sensors() {
  return request_json(`${API_URL}/api/sensors`);
}