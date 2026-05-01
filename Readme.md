# CorpNetMonitor — Frontend

Vanilla JS + Vite. No frameworks, no SSR, minimal dependencies.

## Dependencies

- Node.js 18+
- npm 9+

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open: http://localhost:4200

Vite automatically proxies `/api/*` → `http://localhost:8080`.
The backend (Spring Boot) must be running on port **8080**.

## Production Build

```bash
npm run build
```

Output goes to the `dist/` folder. Can be served via Nginx or any static file server.

### Example Nginx Config (if frontend and backend are on the same machine)

```nginx
server {
    listen 80;

    location / {
        root /path/to/corp-net-front/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
    }
}
```

## Project Structure

```
corp-net-front/
├── index.html          # dashboard markup
├── vite.config.js      # Vite config (proxy, port)
├── package.json
└── src/
    ├── main.js         # entry point: state, polling, events
    ├── api.js          # all backend calls
    ├── charts.js       # Chart.js: CPU and Network graphs
    ├── render.js       # DOM updates
    └── style.css       # styles
```

## Backend Endpoints Used

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/devices` | List all devices |
| POST | `/api/devices` | Add a device (body: `{ ipAddress }`) |
| PUT | `/api/devices/{id}` | Update a device |
| DELETE | `/api/devices/{id}` | Delete a device |
| GET | `/api/devices/{id}/metrics/latest` | Latest metrics (CPU, uptime, storage, network) |
| GET | `/api/devices/{id}/interfaces` | Network interfaces |

Metrics polling interval: every **5 seconds**.

## Behavior

- On load, automatically fetches the first device from the list
- CPU and Network graphs update in real time (last 30 data points)
- When a device is added, the backend connects via SNMP and pulls its name, OS, and interfaces automatically
- If a device is unreachable, an error banner is shown — polling continues regardless