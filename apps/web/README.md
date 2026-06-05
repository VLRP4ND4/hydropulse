# HydroPulse Web

React frontend для мониторинга уровня воды.

```bash
npm install
npm start
```

Перед запуском backend должен работать на `http://localhost:3001`.

Если backend запущен на другом адресе, укажи его в `apps/web/.env`:

```env
REACT_APP_API_URL=http://localhost:3001
```

Карта работает через Leaflet/OpenStreetMap.
