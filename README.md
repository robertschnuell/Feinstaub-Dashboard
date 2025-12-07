# Feinstaub Dashboard

Real-time particle sensor monitoring dashboard for the [ELV-LW-SPM LoRaWAN® Particle Sensor](https://de.elv.com/p/elv-lorawan-feinstaubsensor-elv-lw-spm-P160408/?itemId=160408). Built with Next.js frontend and Node.js backend, receives sensor data from The Things Network via MQTT and displays live charts.

The ELV-LW-SPM is a high-quality particle sensor based on the Sensirion SPS30 sensor, transmitting data via LoRaWAN. It measures PM1.0, PM2.5, PM4.0, PM10 mass concentrations, particle counts, typical particle size, temperature, and humidity.

## Features

- Real-time data visualization via WebSocket
- Historical data storage with SQLite
- Password authentication
- Responsive design with shadcn/ui components
- 5 chart types: PM mass, PM count, particle size, temperature, humidity
- Time range selection: 1h, 6h, 24h, 7d, 30d, all
- Docker support for easy deployment

## Requirements

### Manual Setup
- Node.js 20+
- npm or yarn

### Docker Setup
- Docker
- Docker Compose

## Manual Setup

### Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set:
- `DASHBOARD_PASSWORD` - Your dashboard password
- `APP_TITLE` - Application title
- `APP_SUBTITLE` - Application subtitle
- `MQTT_HOST` - The Things Network MQTT broker
- `MQTT_USERNAME` - Your TTN username
- `MQTT_PASSWORD` - Your TTN API key
- `MQTT_TOPIC` - TTN topic pattern

4. Start backend:
```bash
npm start
```

Backend runs on `http://localhost:9176`

### Frontend

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and set:
- `NEXT_PUBLIC_BACKEND_URL` - Backend URL (default: http://localhost:9176)
- `NEXT_PUBLIC_FRONTEND_URL` - Frontend URL (default: http://localhost:9177)
- `NEXT_PUBLIC_APP_TITLE` - Application title
- `NEXT_PUBLIC_APP_SUBTITLE` - Application subtitle

4. Start frontend:
```bash
npm run dev
```

Frontend runs on `http://localhost:9177`

## Docker Setup

### Quick Start

1. Copy environment template:
```bash
cp .env.docker .env
```

2. Edit `.env` file with your configuration:
```env
# Port Configuration (optional, defaults: 9176/9177)
BACKEND_PORT=9176
FRONTEND_PORT=9177
BACKEND_URL=http://backend:9176
FRONTEND_URL=http://localhost:9177

# Dashboard Configuration
DASHBOARD_PASSWORD=your-secure-password
APP_TITLE=Feinstaub Monitoring
APP_SUBTITLE=Particle Sensor

# MQTT Configuration
MQTT_HOST=mqtts://eu1.cloud.thethings.network:8883
MQTT_USERNAME=your-ttn-app-id@ttn
MQTT_PASSWORD=your-ttn-api-key
MQTT_TOPIC=v3/your-ttn-app-id@ttn/devices/+/up
```

3. Build and start containers:
```bash
docker-compose up -d
```

4. Access dashboard:
- Frontend: http://localhost:9177
- Backend API: http://localhost:9176

### Docker Commands

```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up -d --build

# Stop and remove volumes (deletes database)
docker-compose down -v
```

### Custom Port Configuration

Ports can be customized via environment variables in `.env`:

```env
# Example: Use ports 8080 and 8081
BACKEND_PORT=8080
FRONTEND_PORT=8081
BACKEND_URL=http://backend:8080
FRONTEND_URL=http://localhost:8081
```

**Important:** When changing `BACKEND_PORT`, also update `BACKEND_URL` to match. The `BACKEND_URL` uses the Docker internal network (`backend` is the container name), while `FRONTEND_URL` is the public-facing URL.

After changing ports:
```bash
docker-compose down
docker-compose up -d
```

### Data Persistence

SQLite database is stored in a Docker volume named `backend-data`. This ensures data persists across container restarts. To backup or reset:

```bash
# List volumes
docker volume ls

# Backup database
docker cp feinstaub-backend:/app/feinstaub.db ./backup.db

# Remove volume (deletes all data)
docker-compose down -v
```

## Environment Variables

### Docker (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_PORT` | Backend port | `9176` |
| `FRONTEND_PORT` | Frontend port | `9177` |
| `BACKEND_URL` | Backend internal URL | `http://backend:9176` |
| `FRONTEND_URL` | Frontend public URL | `http://localhost:9177` |
| `DASHBOARD_PASSWORD` | Authentication password | `feinstaub` |
| `APP_TITLE` | Application title | `Feinstaub Monitoring` |
| `APP_SUBTITLE` | Application subtitle | `Particle Sensor` |
| `MQTT_HOST` | MQTT broker URL | `mqtts://eu1.cloud.thethings.network:8883` |
| `MQTT_USERNAME` | TTN username | `your-app@ttn` |
| `MQTT_PASSWORD` | TTN API key | `NNSXS.XXXXX` |
| `MQTT_TOPIC` | TTN topic pattern | `v3/your-app@ttn/devices/+/up` |

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend port | `9176` |
| `DASHBOARD_PASSWORD` | Authentication password | `feinstaub` |
| `APP_TITLE` | Application title | `Feinstaub Monitoring` |
| `APP_SUBTITLE` | Application subtitle | `Particle Sensor` |
| `MQTT_HOST` | MQTT broker URL | `mqtts://eu1.cloud.thethings.network:8883` |
| `MQTT_USERNAME` | TTN username | `your-app@ttn` |
| `MQTT_PASSWORD` | TTN API key | `NNSXS.XXXXX` |
| `MQTT_TOPIC` | TTN topic pattern | `v3/your-app@ttn/devices/+/up` |

### Frontend (.env.local)
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL | `http://localhost:9176` |
| `NEXT_PUBLIC_FRONTEND_URL` | Frontend URL | `http://localhost:9177` |
| `NEXT_PUBLIC_APP_TITLE` | Application title | `Feinstaub Monitoring` |
| `NEXT_PUBLIC_APP_SUBTITLE` | Application subtitle | `Particle Sensor` |

## API Endpoints

### Public
- `GET /health` - Health check
- `GET /api/config` - Get app configuration
- `POST /api/auth` - Authenticate with password

### Protected (require Bearer token)
- `GET /api/current` - Current sensor data
- `GET /api/historical?hours=24` - Historical data
- `GET /api/stats` - Database statistics

## WebSocket Events

### Client receives:
- `currentData` - Current sensor readings
- `newData` - New data arrival notification

## Production Deployment

### Debian/Ubuntu Server

1. Install Docker and Docker Compose:
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
```

2. Clone or upload project to server

3. Configure environment:
```bash
cp .env.docker .env
nano .env  # Edit configuration
```

4. Start services:
```bash
sudo docker-compose up -d
```

5. Configure firewall:
```bash
sudo ufw allow 9177/tcp  # Frontend
sudo ufw allow 9176/tcp  # Backend (optional, if external access needed)
```

6. Set up reverse proxy (optional):
Use nginx or Apache to proxy port 9177 to domain with SSL.

### Systemd Service (Manual Setup)

Create `/etc/systemd/system/feinstaub-backend.service`:
```ini
[Unit]
Description=Feinstaub Backend
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable feinstaub-backend
sudo systemctl start feinstaub-backend
```

## Development

### Backend Structure
```
backend/
├── server.js          # Main server file
├── package.json       # Dependencies
├── .env              # Configuration
├── feinstaub.db      # SQLite database (created at runtime)
└── Dockerfile        # Docker configuration
```

### Frontend Structure
```
frontend/
├── app/
│   ├── page.js           # Main dashboard
│   ├── layout.js         # Root layout
│   ├── globals.css       # Global styles
│   └── api/              # API routes
├── components/ui/        # shadcn/ui components
├── .env.local           # Configuration
└── Dockerfile           # Docker configuration
```

## Troubleshooting

### MQTT connection fails
- Verify MQTT credentials in `.env`
- Check TTN console for API key validity
- Ensure MQTT topic matches device configuration

### Database errors
- Check file permissions for `feinstaub.db`
- In Docker: verify volume mount

### Frontend can't reach backend
- Check `NEXT_PUBLIC_BACKEND_URL` in frontend `.env.local`
- In Docker: use `http://backend:9176` (container name)
- For manual setup: use `http://localhost:9176`

### Port conflicts
- Check if ports 9176/9177 are already in use
- Change ports in `.env` or `docker-compose.yml`

## License

MIT
