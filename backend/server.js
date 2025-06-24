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
const parseTicketText = require('./utils/parser');
const generateFingerprint = require('./utils/fingerprint');

const app = express();

// General Middleware
app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));

// Route Registration
app.use('/', authService);
app.use('/', userService);
app.use('/', recaptchaService);
app.use('/', facialRecognition);

// ticket upload
app.post('/upload', upload.single('ticket'), async (req, res) => {
    try {
        const { path } = req.file;

        const formData = new FormData();
        formData.append('image', fs.createReadStream(path));

        const ocrResponse = await axios.post('http://localhost:5001/ocr', formData, {
            headers: formData.getHeaders(),
        });

        const text = ocrResponse.data.text;
        console.log('OCR Result:', text);

        // add fraud detection logic later 
        res.status(200).json({ status: 'OK', parsedText: text });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error processing ticket' });
    }
});

const ticketInfo = parseTicketText(ocrText);
const fingerprint = generateFingerprint(ticketInfo); 

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});