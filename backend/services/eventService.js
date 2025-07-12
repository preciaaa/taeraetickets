// EVENTS DB
const express = require('express');
const connectToSupabase = require('../db/supabase');
const supabase = connectToSupabase();
const router = express.Router()

// GET all events
router.get('/events', async (req, res) => {
	try {
		const { data, error } = await supabase.from('events').select('*');
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Create an event
router.post('/events/create', async (req, res) => {
	try {
		const { title, venue } = req.body; 
		const { data, error } = await supabase
			.from('events')
			.insert([{ title, venue }]);
		if (error) throw error;
		res.status(201).json(data); 
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router