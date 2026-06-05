import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./gmap.scss";

const DEFAULT_CENTER = {
  lat: 63.57281,
  lng: 125.21271,
};

// Leaflet требует числовые координаты, поэтому значения из PostgreSQL приводятся явно.
function to_number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function format_cm(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)} см` : "—";
}

function status_text(status) {
  switch (status) {
    case "critical":
      return "Критический";
    case "danger":
      return "Опасный";
    case "normal":
      return "Нормально";
    default:
      return "Нет данных";
  }
}

// Экранируем HTML в popup, потому что названия гидропостов приходят из БД.
function escape_html(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Берем только станции с корректными координатами: без latitude/longitude маркер поставить нельзя.
function get_points(stations) {
  return (stations || [])
    .filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
    .map((item) => ({
      ...item,
      lat: Number(item.latitude),
      lng: Number(item.longitude),
    }));
}

// Цвет и вид маркера задаются CSS-классами по статусу уровня воды.
function marker_icon(status, selected) {
  return L.divIcon({
    className: `leafletHydroMarker ${status || "no_data"} ${selected ? "selected" : ""}`,
    html: "<span></span>",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -12],
  });
}

// HTML popup собирается строкой, потому что Leaflet работает вне React-дерева.
function popup_html(point) {
  return `
    <div class="mapInfoWindow">
      <h4>${escape_html(point.monitoring_station_name)}</h4>
      <p><b>Статус:</b> ${status_text(point.water_level_status)}</p>
      <p><b>Река:</b> ${escape_html(point.water_body_name || "—")}</p>
      <p><b>Уровень воды:</b> ${format_cm(point.water_level_cm)}</p>
      <p><b>Критический уровень:</b> ${format_cm(point.critical_level_cm)}</p>
      <p><b>Координаты:</b> ${to_number(point.latitude).toFixed(4)}, ${to_number(point.longitude).toFixed(4)}</p>
    </div>
  `;
}

// При первом открытии карта автоматически приближает все точки мониторинга.
function fit_map_to_points(map, points) {
  if (!map || !points.length) return;

  if (points.length === 1) {
    map.setView([points[0].lat, points[0].lng], 9, { animate: true });
    return;
  }

  const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
  map.fitBounds(bounds, {
    padding: [34, 34],
    maxZoom: 11,
    animate: true,
  });
}

// Внутренний компонент напрямую управляет Leaflet-картой.
// React отвечает за входные props, а refs хранят объект карты и созданные маркеры.
function LeafletMap({ center, points, selectedStationId, onSelectStation, addMode, onMapClick, resetNonce }) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const propsRef = useRef({ addMode, onMapClick, onSelectStation });
  const pointsRef = useRef(points);
  const didFitRef = useRef(false);

  useEffect(() => {
    // propsRef нужен, чтобы обработчик click видел свежие callback-и без пересоздания карты.
    propsRef.current = { addMode, onMapClick, onSelectStation };
  }, [addMode, onMapClick, onSelectStation]);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    // Создаем карту один раз после появления DOM-узла.
    if (!nodeRef.current || mapRef.current) return undefined;

    const map = L.map(nodeRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      worldCopyJump: false,
      attributionControl: false,
    }).setView([center.lat, center.lng], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      keepBuffer: 4,
      updateWhenIdle: false,
      updateWhenZooming: true,
    }).addTo(map);

    map.on("click", (event) => {
      // В режиме добавления метки клик по карте передает координаты наверх в страницу Map.
      if (!propsRef.current.addMode || !propsRef.current.onMapClick) return;
      propsRef.current.onMapClick({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);
    const markers = markersRef.current;

    return () => {
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextIds = new Set(points.map((point) => String(point.monitoring_station_id)));

    // Удаляем маркеры, которых больше нет в данных API.
    markersRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Обновляем существующие маркеры или создаем новые.
    points.forEach((point) => {
      const id = String(point.monitoring_station_id);
      const selected = String(selectedStationId) === id;
      const icon = marker_icon(point.water_level_status || "no_data", selected);
      const existing = markersRef.current.get(id);

      if (existing) {
        existing.setLatLng([point.lat, point.lng]);
        existing.setIcon(icon);
        existing.setPopupContent(popup_html(point));
        return;
      }

      const marker = L.marker([point.lat, point.lng], {
        icon,
        title: point.monitoring_station_name,
      }).addTo(map);

      marker.bindPopup(popup_html(point), {
        closeButton: true,
        className: "hydroLeafletPopup",
      });
      marker.on("click", () => {
        if (propsRef.current.onSelectStation) {
          propsRef.current.onSelectStation(point.monitoring_station_id);
        }
      });
      markersRef.current.set(id, marker);
    });

    if (!didFitRef.current && points.length > 0) {
      fit_map_to_points(map, points);
      didFitRef.current = true;
    }
  }, [points, selectedStationId]);

  useEffect(() => {
    if (resetNonce > 0) {
      fit_map_to_points(mapRef.current, pointsRef.current);
    }
  }, [resetNonce]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 0);
    }
  }, [points.length]);

  return <div className={`leafletMap ${addMode ? "adding" : ""}`} ref={nodeRef} />;
}

const GMap = ({
  title = "Карта мониторинга",
  center = DEFAULT_CENTER,
  stations = [],
  selectedStationId,
  onSelectStation,
  addMode = false,
  onMapClick,
}) => {
  // Наружный компонент готовит точки и передает их во внутренний Leaflet-слой.
  const points = useMemo(() => get_points(stations), [stations]);
  const [resetNonce, setResetNonce] = useState(0);

  return (
    <div className="GMap">
      <div className="mapHeader">
        <div>
          <h3>{title}</h3>
          {addMode && <p className="addHint">Режим добавления метки активен.</p>}
        </div>
        <div className="mapHeaderActions">
          <span>{points.length} постов</span>
          <button type="button" onClick={() => setResetNonce((value) => value + 1)}>
            Показать все
          </button>
        </div>
      </div>

      <div className="googleMapCanvas">
        <LeafletMap
          center={center}
          points={points}
          selectedStationId={selectedStationId}
          onSelectStation={onSelectStation}
          addMode={addMode}
          onMapClick={onMapClick}
          resetNonce={resetNonce}
        />

        {points.length === 0 && (
          <div className="mapEmpty">Добавьте координаты гидропостов в PostgreSQL, чтобы появились точки.</div>
        )}

      </div>
    </div>
  );
};

export default GMap;
