const express = require('express');
const connectToSupabase = require('../db/supabase');
const supabase = connectToSupabase();
const router = express.Router()


// Add to cart
router.post('/cart', async (req, res) => {
    const { user_id, ticket_id, quantity } = req.body;

    const { error } = await supabase
        .from('cart')
        .upsert([{ user_id, ticket_id, quantity }], { onConflict: ['user_id', 'ticket_id'] });

    if (error) return res.status(500).json({ error });
    res.json({ success: true });
});

// Get all cart items with ticket details
router.get('/cart/:user_id', async (req, res) => {
    const { user_id } = req.params;
  
    // 1. Get all cart items for user
    const { data: cartItems, error: cartError } = await supabase
      .from('cart')
      .select('ticket_id, quantity')
      .eq('user_id', user_id);
  
    if (cartError) return res.status(500).json({ error: cartError.message });
    if (!cartItems || cartItems.length === 0) return res.json([]);
  
    // 2. Extract ticket IDs from cart
    const ticketIds = cartItems.map(c => c.ticket_id);
  
    // 3. Query listings using resale_ticket_id matching ticketIds
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('resale_ticket_id, event_name, category, section, row, seat_number, date, price')
      .in('resale_ticket_id', ticketIds);
  
    if (listingsError) return res.status(500).json({ error: listingsError.message });
  
    // 4. Merge cart quantities with listings matching on ticket_id <-> resale_ticket_id
    const merged = cartItems.map(cartItem => {
      const listing = listings.find(l => l.resale_ticket_id === cartItem.ticket_id);
      return {
        ticket_id: cartItem.ticket_id,
        quantity: cartItem.quantity,
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

    const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user_id)
        .eq('ticket_id', ticket_id);

    if (error) return res.status(500).json({ error });

    res.json({ success: true });
});

module.exports = router;

