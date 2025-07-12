const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: './.env.local' });

// Import the service routers
const authService = require('./services/authService');
const userService = require('./services/userService');
const recaptchaService = require('./services/recaptchaService');
const eventService = require('./services/eventService');
const listingService = require('./services/listingService');

const app = express();

// General Middleware
app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));

// Route Registration
app.use('/', authService);
app.use('/', userService);
app.use('/', recaptchaService);
app.use('/', eventService);
app.use('/', listingService);

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});