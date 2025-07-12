const express = require('express');
const connectToSupabase = require('../db/supabase');
const supabase = connectToSupabase();
const router = express.Router()


// Add to cart
router.post('/cart', async (req, res) => {
    const { user_id, ticket_id } = req.body;
  
    // Get price for this ticket
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('price')
      .eq('ticket_id', ticket_id)
      .single();
  
    if (listingError || !listing) {
      return res.status(400).json({ error: 'Ticket not found in listings' });
    }
  
    const total_amount = listing.price;
  
    // Insert ticket into cart
    const { error } = await supabase
      .from('cart')
      .insert([{ user_id, ticket_id, total_amount }]);
  
    if (error) return res.status(500).json({ error });
  
    res.json({ success: true, total_amount });
  });

// Get all cart items with ticket details
router.get('/cart/:user_id', async (req, res) => {
    const { user_id } = req.params;
  
    const { data: cartItems, error: cartError } = await supabase
      .from('cart')
      .select('ticket_id, total_amount')
      .eq('user_id', user_id);
  
    if (cartError) return res.status(500).json({ error: cartError.message });
    if (!cartItems || cartItems.length === 0) return res.json([]);
  
    const ticketIds = cartItems.map(c => c.ticket_id);
  
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('ticket_id, event_name, category, section, row, seat_number, date, price')
      .in('ticket_id', ticketIds);
  
    if (listingsError) return res.status(500).json({ error: listingsError.message });
  
    const merged = cartItems.map(cartItem => {
      const listing = listings.find(l => l.ticket_id === cartItem.ticket_id);
      return {
        ticket_id: cartItem.ticket_id,
        total_amount: cartItem.total_amount,
        event_name: listing?.event_name || null,
        category: listing?.category || null,
        section: listing?.section || null,
        row: listing?.row || null,
        seat_number: listing?.seat_number || null,
        date: listing?.date || null,
        price: listing?.price || null,
      };
    });
  
    res.json(merged);
  });


// Remove from cart
router.delete('/cart/:user_id/:ticket_id', async (req, res) => {
    const { user_id, ticket_id } = req.params;
  
    // Step 1: Find the ctid of one matching row
    const { data: rows, error: selectError } = await supabase
      .from('cart')
      .select('ctid')
      .eq('user_id', user_id)
      .eq('ticket_id', ticket_id)
      .limit(1);
  
    if (selectError) {
      return res.status(500).json({ error: selectError.message });
    }
  
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found in cart' });
    }
  
    const ctid = rows[0].ctid;
  
    // Step 2: Delete the row using the ctid system column
    // Supabase JS client doesn't support filtering by ctid directly,
    // so we use raw SQL through RPC or direct query.
  
    // Use Supabase's rpc or query functionality to run raw SQL
    // Here’s how you can run raw SQL with Supabase JS:
  
    const { data, error } = await supabase.rpc('delete_cart_row_by_ctid', { row_ctid: ctid });
  
    if (error) return res.status(500).json({ error: error.message });
  
    res.json({ success: true });
  });

module.exports = router;

