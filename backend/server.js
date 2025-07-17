const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: './.env.local' });
const cron = require('node-cron');

// Import the service routers
const authService = require('./services/authService');
const userService = require('./services/userService');
const recaptchaService = require('./services/recaptchaService');
const paymentService = require('./services/paymentService');
const eventService = require('./services/eventService');
const listingService = require('./services/listingService');
const autoReleaseJob = require('./jobs/autoRelease');

const app = express();

// General Middleware
app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));

// Route Registration
app.use('/', authService);
app.use('/', userService);
app.use('/', recaptchaService);
app.use('/', paymentService);
app.use('/', eventService);
app.use('/', listingService);   

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Schedule: every day at 12am
cron.schedule('0 0 * * *', async () => {
    console.log('Running auto-release at 12am...');
    await autoReleaseJob();
  });