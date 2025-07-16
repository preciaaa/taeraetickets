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
    .select('ticket_id, event_name, category, section, row, seat_number, date, price, original_owner_id')
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
      original_owner_id: listing?.original_owner_id || null,
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
    const { userId, email } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Check if user already has a stripe_account_id saved in DB
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();

    if (userError) {
      return res.status(500).json({ error: 'Failed to fetch user info' });
    }

    let stripeAccountId = user?.stripe_account_id;

    if (!stripeAccountId) {
      // Create new Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'standard',
        country: 'SG',
        email, // optional but recommended for onboarding
      });

      // Save Stripe account ID to DB
      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_account_id: account.id })
        .eq('id', userId);

      if (updateError) {
        return res.status(500).json({ error: 'Failed to save Stripe account ID' });
      }

      stripeAccountId = account.id;
    }

    // Create onboarding / login link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: 'http://localhost:3000/onboard',
      return_url: 'http://localhost:3000/profile',
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe create account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// checkout route
router.post('/checkout', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // 1. Get cart items
    const { data: cartItems, error: cartError } = await supabase
      .from('cart')
      .select('ticket_id')
      .eq('user_id', userId);

    if (cartError) return res.status(500).json({ error: 'Failed to get cart' });
    if (!cartItems || cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    const ticketIds = cartItems.map(c => c.ticket_id);

    // 2. Get listing info
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('ticket_id, original_owner_id, price, date')
      .in('ticket_id', ticketIds);

    if (listingsError || !listings || listings.length === 0) {
      return res.status(500).json({ error: 'Failed to fetch listings info' });
    }

    // 3. Build payment items
    const items = cartItems.map(cartItem => {
      const listing = listings.find(l => l.ticket_id === cartItem.ticket_id);
      if (!listing) throw new Error(`Listing not found for ticket_id: ${cartItem.ticket_id}`);
      return {
        ticketId: cartItem.ticket_id,
        sellerId: listing.original_owner_id,
        amount: listing.price,
        eventDate: listing.date,
      };
    });

    // 4. Validate single seller
    const uniqueSellers = [...new Set(items.map(i => i.sellerId))];
    if (uniqueSellers.length > 1) {
      return res.status(400).json({ error: 'Checkout must contain items from one seller only' });
    }
    const sellerId = uniqueSellers[0];

    // 5. Get seller's Stripe ID
    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', sellerId)
      .single();

    if (sellerError || !seller?.stripe_account_id) {
      return res.status(400).json({ error: 'Seller does not have a Stripe account' });
    }

    const stripeAccountId = seller.stripe_account_id;

    // 6. Calculate total amount
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    // 7. Create payment intent with direct payout
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'sgd',
      payment_method_types: ['card'],
      transfer_data: {
        destination: stripeAccountId,
      },
      metadata: {
        buyer_id: userId,
        ticket_ids: items.map(i => i.ticketId).join(','),
      },
    });

    // 8. Insert payment record
    const { data: paymentRecord, error: paymentInsertError } = await supabase
      .from('payments')
      .insert({
        original_owner_id: userId,
        total_amount: totalAmount,
        payment_intent_id: paymentIntent.id,
        status: 'initiated',
      })
      .select()
      .single();

    if (paymentInsertError || !paymentRecord) {
      return res.status(500).json({ error: 'Failed to create payment record' });
    }

    // 9. Insert payment items
    const insertPromises = items.map(item =>
      supabase.from('payment_items').insert({
        payment_id: paymentRecord.payment_id,
        original_owner_id: item.sellerId,
        ticket_id: item.ticketId,
        amount: item.amount,
        event_date: item.eventDate,
        status: 'initiated',
      })
    );
    const insertResults = await Promise.all(insertPromises);

    // --- Update listings status to 'sold' and set new_owner_id to buyer ---
    const { error: updateListingError } = await supabase
      .from('listings')
      .update({
        status: 'sold',
        new_owner_id: userId
      })
      .in('ticket_id', ticketIds);

    if (updateListingError) {
      console.error('Failed to update listings status and new owner:', updateListingError);
      return res.status(500).json({ error: 'Failed to update listings to sold and assign new owner' });
    }

    // 10. Clear cart
    await supabase.from('cart').delete().eq('user_id', userId);


    return res.json({
      clientSecret: paymentIntent.client_secret,
      payment_id: paymentRecord.payment_id,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Internal server error during checkout' });
  }
});

// get payment-items
router.get('/payment-items/:user_id', async (req, res) => {
  const { user_id } = req.params;

  const { data, error } = await supabase
    .from('payment_items')
    .select('*')
    .eq('new_owner_id', user_id);

  if (error) return res.status(500).json({ error: 'Failed to fetch payment items' });

  res.json(data);
});


// === POST-PURCHASE ACTIONS ===

router.post('/confirm-purchase', async (req, res) => {
  try {
    const { payment_id, buyer_id } = req.body;

    if (!payment_id || !buyer_id) {
      return res.status(400).json({ error: 'Missing payment_id or buyer_id' });
    }

    // Get payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', payment_id)
      .single();

    if (paymentError || !payment) {
      return res.status(400).json({ error: 'Payment not found' });
    }

    if (payment.original_owner_id !== buyer_id || payment.status !== 'initiated') {
      return res.status(400).json({ error: 'Invalid payment state or buyer mismatch' });
    }

    // Get payment items
    const { data: paymentItems, error: itemsError } = await supabase
      .from('payment_items')
      .select('*')
      .eq('payment_id', payment_id);

    if (itemsError) {
      return res.status(500).json({ error: 'Error fetching payment items' });
    }

    // Mark all items as released
    const updatePromises = paymentItems.map(item =>
      supabase
        .from('payment_items')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
        })
        .eq('id', item.id)
    );
    await Promise.all(updatePromises);

    // Update overall payment status
    await supabase
      .from('payments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        released_at: new Date().toISOString(),
      })
      .eq('payment_id', payment_id);

    // Update related listings to "confirmed"
    const ticketIds = paymentItems.map(item => item.ticket_id);
    const { error: listingUpdateError } = await supabase
      .from('listings')
      .update({ status: 'confirmed' })
      .in('ticket_id', ticketIds);

    if (listingUpdateError) {
      console.error('Failed to update listings to confirmed:', listingUpdateError);
      return res.status(500).json({ error: 'Failed to update listing status' });
    }

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

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('payment_id, original_owner_id')
      .eq('status', 'initiated');

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }

    let releasedCount = 0;

    for (const payment of payments) {
      const { data: items, error: itemsError } = await supabase
        .from('payment_items')
        .select('*')
        .eq('payment_id', payment.payment_id)
        .eq('status', 'initiated');

      if (itemsError) {
        console.error(`Error fetching payment_items for payment ${payment.payment_id}:`, itemsError);
        continue; // skip this payment and continue
      }

      if (!items || items.length === 0) continue;

      // Check if all events passed more than 1 week ago
      const allEventsPassed = items.every(item => new Date(item.event_date) < oneWeekAgo);
      if (!allEventsPassed) continue;

      for (const item of items) {
        try {
          const { data: seller, error: sellerError } = await supabase
            .from('users')
            .select('stripe_account_id')
            .eq('id', item.original_owner_id)
            .single();

          if (sellerError || !seller?.stripe_account_id) {
            console.warn(`Skipping transfer: no Stripe account for seller ${item.original_owner_id}`);
            continue;
          }

          await stripe.transfers.create({
            amount: Math.round(item.amount * 100), // amount in cents
            currency: 'sgd', // or your platform currency
            destination: seller.stripe_account_id,
            transfer_group: `payment_${payment.payment_id}`,
          });

          await supabase
            .from('payment_items')
            .update({
              status: 'released',
              released_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          console.log(`Transfer successful for payment_item ${item.id}`);
        } catch (transferErr) {
          console.error(`Transfer failed for payment_item ${item.id}:`, transferErr);
          // Decide if you want to continue or halt here. We'll continue.
          continue;
        }
      }

      // After all items processed, update payment status
      await supabase
        .from('payments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('payment_id', payment.payment_id);

      releasedCount++;
    }

    res.json({ success: true, message: `${releasedCount} payments auto-released.` });
  } catch (err) {
    console.error('Auto-release error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// === REPORT SELLER ROUTE ===

router.post('/report-seller', async (req, res) => {
  try {
    const { payment_id, original_owner_id, reason } = req.body;

    if (!payment_id || !original_owner_id || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch payment by payment_id
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', payment_id)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify the reporter is the buyer (original_owner_id)
    if (payment.original_owner_id !== original_owner_id) {
      return res.status(403).json({ error: 'Unauthorized: You can only report your own payments' });
    }

    // Update payment status to disputed
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'disputed',
        dispute_reason: reason,
        disputed_at: new Date().toISOString(),
      })
      .eq('payment_id', payment_id);

    if (updateError) {
      console.error('Failed to update payment as disputed:', updateError);
      return res.status(500).json({ error: 'Failed to mark payment as disputed' });
    }

    res.json({ success: true, message: 'Seller reported and payment marked as disputed' });
  } catch (err) {
    console.error('Report seller error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// === PAYMENT HISTORY ROUTES ===
router.get('/payments/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('payment_id, total_amount, status') // make sure 'id' is selected
      .eq('original_owner_id', userId)   // or buyer_id if your schema uses that
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});


module.exports = router;
