const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: './.env.local' });
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');

// Import the service routers
const authService = require('./services/authService');
const userService = require('./services/userService');
const recaptchaService = require('./services/recaptchaService');
const facialRecognition = require('./services/facialRecognition');
const listingService = require('./services/listingService');
const parseTicketText = require('./utils/parser');
const generateFingerprint = require('./utils/fingerprint');

const app = express();

// General Middleware
app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (must be before other routes)
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Route Registration
app.use('/', authService);
app.use('/', userService);
app.use('/', recaptchaService);
app.use('/', facialRecognition);
app.use('/', listingService);

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Health check available at http://localhost:${port}/health`);
});