// LISTINGS DB
const express = require('express');
const connectToSupabase = require('../db/supabase');
const supabase = connectToSupabase();
const router = express.Router()

// GET all listings
router.get('/listings', async (req, res) => {
	try {
		const { data, error } = await supabase.from('listings').select('*');
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get('/listings/:ticket_id', async (req, res) => {
	try {
        const { ticket_id } = req.params;
        const { data, error } = await supabase
            .from('listings')
            .select('*')
            .eq('id', ticket_id)
            .single(); // Ensures only one record is returned

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        res.status(404).json({ error: err.message || 'Listing not found' });
    }
});


router.put('/listings/:ticket_id', async (req, res) => {
	try {
		const { ticket_id } = req.params;
		const updateFields = req.body;

		const { data, error } = await supabase
			.from('listings')
			.update(updateFields)
			.eq('id', ticket_id)
			.select()

		if (error) throw error;

		res.status(200).json(data);
	} catch (err) {
		res.status(400).json({ error: err.message || 'Failed to update listing' });
	}
});

module.exports = router