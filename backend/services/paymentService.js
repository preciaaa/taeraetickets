// --- services/stripeService.js ---
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const connectToSupabase = require('../db/supabase');
const supabase = connectToSupabase();

// === CART ROUTES ===

router.post('/cart', async (req, res) => {
    const { user_id, ticket_id } = req.body;
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('price')
      .eq('ticket_id', ticket_id)
      .single();
  
    if (listingError || !listing) {
      return res.status(400).json({ error: 'Ticket not found in listings' });
    }
  
    const total_amount = listing.price;
    const { error } = await supabase
      .from('cart')
      .insert([{ user_id, ticket_id, total_amount }]);
  
    if (error) return res.status(500).json({ error });
    res.json({ success: true, total_amount });
  });
  
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
      .select('ticket_id, event_name, category, section, row, seat_number, date, price, seller_id')
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
        seller_id: listing?.seller_id || null,
      };
    });
  
    res.json(merged);
  });
  
  router.delete('/cart/:user_id/:ticket_id', async (req, res) => {
    const { user_id, ticket_id } = req.params;
    const { data: rows, error: selectError } = await supabase
      .from('cart')
      .select('ctid')
      .eq('user_id', user_id)
      .eq('ticket_id', ticket_id)
      .limit(1);
  
    if (selectError) return res.status(500).json({ error: selectError.message });
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Ticket not found in cart' });
  
    const ctid = rows[0].ctid;
    const { data, error } = await supabase.rpc('delete_cart_row_by_ctid', { row_ctid: ctid });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });
  
  // === STRIPE CONNECT & PAYMENT ===
  
  router.post('/create-stripe-account', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });
  
      const account = await stripe.accounts.create({ type: 'standard' });
      const { error: dbError } = await supabase
        .from('users')
        .update({ stripe_account_id: account.id })
        .eq('id', userId);
  
      if (dbError) return res.status(500).json({ error: 'Failed to save account ID' });
  
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: 'http://localhost:3000/profile',
        return_url: 'http://localhost:3000/onboarded',
        type: 'account_onboarding',
      });
  
      res.json({ url: accountLink.url });
    } catch (error) {
      console.error('Stripe error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  router.post('/checkout', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });
  
      const { data: cartItems } = await supabase
        .from('cart')
        .select('ticket_id, total_amount')
        .eq('user_id', userId);
  
      const ticketIds = cartItems.map(c => c.ticket_id);
      const { data: listings } = await supabase
        .from('listings')
        .select('ticket_id, seller_id, price, date')
        .in('ticket_id', ticketIds);
  
      const items = cartItems.map(cartItem => {
        const listing = listings.find(l => l.ticket_id === cartItem.ticket_id);
        return {
          ticketId: cartItem.ticket_id,
          sellerId: listing.seller_id,
          amount: listing.price,
          eventDate: listing.date,
        };
      });
  
      const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
  
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        metadata: {
          buyerId: userId,
          ticketIds: items.map(i => i.ticketId).join(','),
        },
      });
  
      const { data: paymentRecord } = await supabase
        .from('payments')
        .insert({
          buyer_id: userId,
          total_amount: totalAmount,
          payment_intent_id: paymentIntent.id,
          status: 'initiated',
        })
        .select()
        .single();
  
      for (const item of items) {
        await supabase.from('payment_items').insert({
          payment_id: paymentRecord.id,
          seller_id: item.sellerId,
          ticket_id: item.ticketId,
          amount: item.amount,
          event_date: item.eventDate,
          status: 'initiated',
        });
      }
  
      await supabase.from('cart').delete().eq('user_id', userId);
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      console.error('Checkout error:', err);
      res.status(500).json({ error: 'Internal server error during checkout' });
    }
  });
  
  // === POST-PURCHASE ACTIONS ===
  
  router.post('/confirm-purchase', async (req, res) => {
    try {
      const { paymentId, buyerId } = req.body;
      const { data: payment } = await supabase.from('payments').select('*').eq('id', paymentId).single();
      if (payment.buyer_id !== buyerId || payment.status !== 'initiated') return res.status(400).json({ error: 'Invalid state' });
  
      const { data: paymentItems } = await supabase.from('payment_items').select('*').eq('payment_id', paymentId);
      for (const item of paymentItems) {
        const { data: seller } = await supabase.from('users').select('stripe_account_id').eq('id', item.seller_id).single();
        if (!seller?.stripe_account_id) continue;
  
        await stripe.transfers.create({
          amount: item.amount,
          currency: 'sgd',
          destination: seller.stripe_account_id,
          transfer_group: `payment_${paymentId}`,
        });
  
        await supabase.from('payment_items').update({
          status: 'released',
          released_at: new Date().toISOString(),
        }).eq('id', item.id);
      }
  
      await supabase.from('payments').update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      }).eq('id', paymentId);
  
      res.json({ success: true });
    } catch (err) {
      console.error('Confirm purchase error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  router.post('/auto-release', async (req, res) => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
      const { data: payments } = await supabase.from('payments').select('id, buyer_id').eq('status', 'initiated');
      let releasedCount = 0;
  
      for (const payment of payments) {
        const { data: items } = await supabase.from('payment_items').select('*').eq('payment_id', payment.id).eq('status', 'initiated');
        const allEventsPassed = items.every(item => new Date(item.event_date) < oneWeekAgo);
        if (!allEventsPassed) continue;
  
        for (const item of items) {
          const { data: seller } = await supabase.from('users').select('stripe_account_id').eq('id', item.seller_id).single();
          if (!seller?.stripe_account_id) continue;
  
          await stripe.transfers.create({
            amount: item.amount,
            currency: 'usd',
            destination: seller.stripe_account_id,
            transfer_group: `payment_${payment.id}`,
          });
  
          await supabase.from('payment_items').update({
            status: 'released',
            released_at: new Date().toISOString(),
          }).eq('id', item.id);
        }
  
        await supabase.from('payments').update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        }).eq('id', payment.id);
  
        releasedCount++;
      }
  
      res.json({ success: true, message: `${releasedCount} payments auto-released.` });
    } catch (err) {
      console.error('Auto-release error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  router.post('/report-seller', async (req, res) => {
    try {
      const { paymentId, buyerId, reason } = req.body;
      const { data: payment } = await supabase.from('payments').select('*').eq('id', paymentId).single();
      if (payment.buyer_id !== buyerId) return res.status(403).json({ error: 'Unauthorized' });
  
      await supabase.from('payments').update({
        status: 'disputed',
        dispute_reason: reason,
        disputed_at: new Date().toISOString(),
      }).eq('id', paymentId);
  
      res.json({ success: true, message: 'Seller reported and payment marked as disputed' });
    } catch (err) {
      console.error('Report seller error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

module.exports = router;
