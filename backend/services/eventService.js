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

// GET event by id
router.get('/events/:id', async (req, res) => {
	try {
		const { data, error } = await supabase.from('events').select('*').select('*').eq('id', req.params.id).single();
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Create an event
router.post('/events/create', async (req, res) => {
	try {
		const { title, venue, img_url, description } = req.body;
		const { data, error } = await supabase
			.from('events')
			.insert([{ title, venue, img_url, description }])
		if (error) throw error;
		res.status(201).json(data); 
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Update event dates
router.post('/events/:id/add-date', async (req, res) => {
	try {
		const { date } = req.body;
		const { id } = req.params;
		const { data, error } = await supabase
			.from('events')
			.update({ date })  // this updates the 'date' column
			.eq('id', id);      // where id matches

		if (error) throw error;

		res.status(200).json({ message: 'Event date updated', data });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router