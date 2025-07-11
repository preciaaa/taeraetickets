const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: './.env.local' });

// Import the service routers
const authService = require('./services/authService');
const userService = require('./services/userService');
const recaptchaService = require('./services/recaptchaService');

const app = express();

// General Middleware
app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));

// Route Registration
app.use('/', authService);
app.use('/', userService);
app.use('/', recaptchaService);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});