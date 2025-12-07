require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Configuration from .env
const PORT = process.env.PORT || 9176;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'feinstaub';
const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const MQTT_TOPIC = process.env.MQTT_TOPIC;

// Initialize SQLite database
const dbPath = path.join(__dirname, 'feinstaub.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at TEXT NOT NULL,
    pm1_mass_ugm3 REAL,
    pm2_5_mass_ugm3 REAL,
    pm4_mass_ugm3 REAL,
    pm10_mass_ugm3 REAL,
    pm1_count_cm3 REAL,
    pm2_5_count_cm3 REAL,
    pm4_count_cm3 REAL,
    pm10_count_cm3 REAL,
    typical_particle_size REAL,
    temperature_C REAL,
    humidity_rel REAL,
    supply_voltage_V REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_received_at ON sensor_data(received_at);
`);

console.log('✅ SQLite database initialized:', dbPath);

// Prepared Statements
const insertData = db.prepare(`
  INSERT INTO sensor_data (
    received_at, pm1_mass_ugm3, pm2_5_mass_ugm3, pm4_mass_ugm3, pm10_mass_ugm3,
    pm1_count_cm3, pm2_5_count_cm3, pm4_count_cm3, pm10_count_cm3,
    typical_particle_size, temperature_C, humidity_rel, supply_voltage_V
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getCurrentData = db.prepare(`
  SELECT * FROM sensor_data ORDER BY received_at DESC LIMIT 1
`);

const getHistoricalData = db.prepare(`
  SELECT * FROM sensor_data 
  WHERE datetime(received_at) >= datetime(?)
  ORDER BY received_at ASC
`);

const getAllData = db.prepare(`
  SELECT * FROM sensor_data ORDER BY received_at ASC
`);

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  
  if (token !== DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  next();
};

// Auth endpoint - validate password
app.post('/api/auth', express.json(), (req, res) => {
  const { password } = req.body;
  
  if (password === DASHBOARD_PASSWORD) {
    res.json({ 
      success: true,
      token: password,
      title: process.env.APP_TITLE || 'Feinstaub Monitoring',
      subtitle: process.env.APP_SUBTITLE || 'Particle Sensor'
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

// In-memory cache for fast access
let currentDataCache = null;

// Initialize MQTT client
const mqttClient = mqtt.connect(MQTT_HOST, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  protocol: 'mqtts',
  rejectUnauthorized: true,
});

mqttClient.on('connect', () => {
  console.log('✅ Connected to The Things Network MQTT Broker');
  mqttClient.subscribe(MQTT_TOPIC, (err) => {
    if (err) {
      console.error('❌ Error subscribing to topic:', err);
    } else {
      console.log(`📡 Topic subscribed: ${MQTT_TOPIC}`);
    }
  });
});

mqttClient.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log('📨 New message received:', new Date().toISOString());
    
    const decoded = payload.uplink_message?.decoded_payload;
    if (!decoded) return;
    
    // In Datenbank speichern
    insertData.run(
      payload.received_at,
      decoded.pm1_mass_ugm3,
      decoded.pm2_5_mass_ugm3,
      decoded.pm4_mass_ugm3,
      decoded.pm10_mass_ugm3,
      decoded.pm1_count_cm3,
      decoded.pm2_5_count_cm3,
      decoded.pm4_count_cm3,
      decoded.pm10_count_cm3,
      decoded.typical_particle_size,
      decoded.temperature_C,
      decoded.humidity_rel,
      decoded.supply_voltage_V
    );
    
    console.log('💾 Data saved to SQLite');
    
    // Update cache
    currentDataCache = {
      received_at: payload.received_at,
      decoded_payload: decoded,
    };
    
    // Sende Update an alle verbundenen Clients
    const historicalEntry = {
      time: payload.received_at,
      pm1_mass_ugm3: decoded.pm1_mass_ugm3,
      pm2_5_mass_ugm3: decoded.pm2_5_mass_ugm3,
      pm4_mass_ugm3: decoded.pm4_mass_ugm3,
      pm10_mass_ugm3: decoded.pm10_mass_ugm3,
      pm1_count_cm3: decoded.pm1_count_cm3,
      pm2_5_count_cm3: decoded.pm2_5_count_cm3,
      pm4_count_cm3: decoded.pm4_count_cm3,
      pm10_count_cm3: decoded.pm10_count_cm3,
      typical_particle_size: decoded.typical_particle_size,
      temperature_C: decoded.temperature_C,
      humidity_rel: decoded.humidity_rel,
    };
    
    io.emit('newData', {
      current: currentDataCache,
      historical: historicalEntry
    });
    console.log('📤 Update sent to WebSocket clients');
  } catch (error) {
    console.error('❌ Error processing MQTT message:', error);
  }
});

mqttClient.on('error', (error) => {
  console.error('❌ MQTT connection error:', error);
});

mqttClient.on('offline', () => {
  console.log('⚠️  MQTT client offline');
});

mqttClient.on('reconnect', () => {
  console.log('🔄 MQTT client attempting to reconnect...');
});

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log('🔌 WebSocket client connected:', socket.id);
  
  // Send current data on connection
  if (currentDataCache) {
    socket.emit('currentData', currentDataCache);
  } else {
    const latest = getCurrentData.get();
    if (latest) {
      const data = {
        received_at: latest.received_at,
        decoded_payload: {
          pm1_mass_ugm3: latest.pm1_mass_ugm3,
          pm2_5_mass_ugm3: latest.pm2_5_mass_ugm3,
          pm4_mass_ugm3: latest.pm4_mass_ugm3,
          pm10_mass_ugm3: latest.pm10_mass_ugm3,
          pm1_count_cm3: latest.pm1_count_cm3,
          pm2_5_count_cm3: latest.pm2_5_count_cm3,
          pm4_count_cm3: latest.pm4_count_cm3,
          pm10_count_cm3: latest.pm10_count_cm3,
          typical_particle_size: latest.typical_particle_size,
          temperature_C: latest.temperature_C,
          humidity_rel: latest.humidity_rel,
          supply_voltage_V: latest.supply_voltage_V,
        }
      };
      socket.emit('currentData', data);
    }
  }
  
  socket.on('disconnect', () => {
    console.log('🔌 WebSocket client disconnected:', socket.id);
  });
});

// API endpoints (with auth)

// GET /api/config - Get app configuration (no auth required for title)
app.get('/api/config', (req, res) => {
  res.json({
    title: process.env.APP_TITLE || 'Feinstaub Monitoring',
    subtitle: process.env.APP_SUBTITLE || 'Particle Sensor'
  });
});

// GET /api/current - Get latest data
app.get('/api/current', authMiddleware, (req, res) => {
  try {
    if (currentDataCache) {
      return res.json(currentDataCache);
    }
    
    const latest = getCurrentData.get();
    if (!latest) {
      return res.status(404).json({ error: 'No data received yet' });
    }
    
    const data = {
      received_at: latest.received_at,
      decoded_payload: {
        pm1_mass_ugm3: latest.pm1_mass_ugm3,
        pm2_5_mass_ugm3: latest.pm2_5_mass_ugm3,
        pm4_mass_ugm3: latest.pm4_mass_ugm3,
        pm10_mass_ugm3: latest.pm10_mass_ugm3,
        pm1_count_cm3: latest.pm1_count_cm3,
        pm2_5_count_cm3: latest.pm2_5_count_cm3,
        pm4_count_cm3: latest.pm4_count_cm3,
        pm10_count_cm3: latest.pm10_count_cm3,
        typical_particle_size: latest.typical_particle_size,
        temperature_C: latest.temperature_C,
        humidity_rel: latest.humidity_rel,
        supply_voltage_V: latest.supply_voltage_V,
      }
    };
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching current data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/historical - Get historical data
app.get('/api/historical', authMiddleware, (req, res) => {
  try {
    const hours = parseInt(req.query.hours);
    
    let data;
    if (hours && hours > 0) {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      data = getHistoricalData.all(cutoffTime);
    } else {
      data = getAllData.all();
    }
    
    const formattedData = data.map(row => ({
      time: row.received_at,
      pm1_mass_ugm3: row.pm1_mass_ugm3,
      pm2_5_mass_ugm3: row.pm2_5_mass_ugm3,
      pm4_mass_ugm3: row.pm4_mass_ugm3,
      pm10_mass_ugm3: row.pm10_mass_ugm3,
      pm1_count_cm3: row.pm1_count_cm3,
      pm2_5_count_cm3: row.pm2_5_count_cm3,
      pm4_count_cm3: row.pm4_count_cm3,
      pm10_count_cm3: row.pm10_count_cm3,
      typical_particle_size: row.typical_particle_size,
      temperature_C: row.temperature_C,
      humidity_rel: row.humidity_rel,
    }));
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats - Statistics about stored data
app.get('/api/stats', authMiddleware, (req, res) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM sensor_data').get();
    const oldest = db.prepare('SELECT received_at FROM sensor_data ORDER BY received_at ASC LIMIT 1').get();
    const newest = db.prepare('SELECT received_at FROM sensor_data ORDER BY received_at DESC LIMIT 1').get();
    
    res.json({
      total_entries: count.count,
      current_data_available: currentDataCache !== null,
      oldest_entry: oldest?.received_at || null,
      newest_entry: newest?.received_at || null,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mqtt_connected: mqttClient.connected,
    uptime: process.uptime(),
    db_connected: db.open,
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}`);
  console.log(`🔌 WebSocket available at ws://localhost:${PORT}`);
  console.log(`🔐 Auth required with password: ${DASHBOARD_PASSWORD}`);
  console.log('\nEndpoints:');
  console.log('  GET /api/current      - Current sensor data (auth)');
  console.log('  GET /api/historical   - Historical data (auth) (query: ?hours=24)');
  console.log('  GET /api/stats        - Statistics (auth)');
  console.log('  GET /health           - Health check (public)');
});

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server wird heruntergefahren...');
  mqttClient.end();
  db.close();
  process.exit(0);
});
