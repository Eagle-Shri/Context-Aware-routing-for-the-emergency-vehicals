require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const db = require('./db/db');
const socketHandler = require('./sockets/socketHandler');

// Route imports
const ambulanceRoutes = require('./routes/ambulanceRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const routeRoutes = require('./routes/routeRoutes');
const policeRoutes = require('./routes/policeRoutes');
const stationRoutes = require('./routes/stationRoutes');
const officerRoutes = require('./routes/officerRoutes');
const driverRoutes = require('./routes/driverRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/police', policeRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Initialize Socket.io handlers
socketHandler(io);

// Initialize database and start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    const result = await db.query('SELECT NOW()');
    console.log('✓ Database connected:', result.rows[0]);

    server.listen(PORT, () => {
      console.log(`\n🚑 Ambulance Routing System started on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket ready for connections\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await db.end();
    console.log('✓ Server closed');
    process.exit(0);
  });
});
