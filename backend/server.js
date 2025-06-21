const express = require('express');
const cors = require('cors'); // Import cors
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' }); // Updated path to .env

// Debug log to verify environment variables
console.log("Loaded environment variables:", {
	SUPABASE_URL: process.env.SUPABASE_URL,
	SUPABASE_KEY: process.env.SUPABASE_KEY,
	PORT: process.env.PORT,
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Add CORS middleware
app.use(
	cors({
		origin: "*", // Allow all origins
		methods: ["GET", "POST", "PUT", "DELETE"], // Explicitly allow DELETE
	})
);

// Supabase connection logic
function connectToSupabase() {
	try {
		// Correctly access environment variables
		const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
		console.log("Connection to Supabase is successful");
		return supabase;
	} catch (error) {
		console.error("Supabase connection error:", error);
		throw error;
	}
}

// Initialize Supabase client
const supabase = connectToSupabase();

// Example route to fetch data from Supabase
app.get('/data', async (req, res) => {
	try {
		const { data, error } = await supabase.from('your_table_name').select('*');
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// AUTH DB
// GET a single user by ID in authentication database
app.get('/auth-users/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.auth.admin.getUserById(req.params.id); // Supabase auth API

        if (error) {
            console.error("Error fetching user from authentication database:", error);
            throw error;
        }

        res.status(200).json(data);
    } catch (err) {
        res.status(404).json({ error: err.message || 'User not found' });
    }
});

// USER DB

// Create a user with Supabase authentication
app.post('/users', async (req, res) => {
	try {
		const { email, password } = req.body; // Expect email and password in the request body
		const { data, error } = await supabase.auth.signUp({ email, password });
		if (error) throw error;
		res.status(201).json(data); // Return the authentication data
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// GET all users
app.get('/users', async (req, res) => {
	try {
		const { data, error } = await supabase.from('users').select('*');
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// GET a user by ID
app.get('/users/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(404).json({ error: err.message || 'User not found' });
    }
});

// UPDATE a user by ID
app.put('/users/:id', async (req, res) => {
	try {
		const { data, error } = await supabase.from('users').update(req.body).eq('id', req.params.id);
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// DELETE a user by ID
app.delete('/users/:id', async (req, res) => {
	try {
		const { data, error } = await supabase.from('users').delete().eq('id', req.params.id);
		if (error) throw error;
		res.status(204).send();
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Start the server
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});