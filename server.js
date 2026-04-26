const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const mediaRoutes = require('./routes/media');

const app = express();
const PORT = process.env.PORT || 5000;

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Simple health check
app.get('/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Create temp directory for processing
const TEMP_DIR = path.join(os.tmpdir(), 'smart-media-processor');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api', mediaRoutes);

// Serve built React frontend in production
const frontendBuild = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'Smart Media Processor API is running. Frontend not built yet.' });
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Smart Media Processor server running on port ${PORT}`);
  console.log(`📁 Temp directory: ${TEMP_DIR}`);
});
