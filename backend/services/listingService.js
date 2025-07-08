const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const FormData = require('form-data');
const { parseTicketText } = require('../utils/parser');
const { generateFingerprint } = require('../utils/fingerprint');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.post('/upload-ticket', upload.single('ticket'), async (req, res) => {
  try {
    // original_owner_id should be the Supabase Auth user.id (UUID)
    // No need to check custom users table
    const { userId } = req.body;
    if (!userId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'User ID is required' });
    }

    const filePath = req.file.path;

    // Check for duplicate image using deduplication service
    const dedupFormData = new FormData();
    dedupFormData.append('image', fs.createReadStream(filePath));
    const dedupResponse = await axios.post('http://localhost:5002/check-duplicate', dedupFormData, {
      headers: dedupFormData.getHeaders(),
    });
    const embedding = dedupResponse.data.embedding; // array of 2048 floats

    // Query Supabase for similar embeddings (vector search)
    // Requires pgvector extension and match_embedding function
    const { data: similarListings, error: matchError } = await supabase.rpc('match_embedding', {
      query_embedding: embedding,
      match_threshold: 0.5, // Tune this threshold as needed
      match_count: 1
    });
    if (matchError) {
      console.error('Error querying for similar embeddings:', matchError);
    }
    if (similarListings && similarListings.length > 0) {
      fs.unlinkSync(filePath); // Clean up temp file
      return res.status(409).json({ error: 'Duplicate ticket image detected (DB check). Listing not created.' });
    }

    const optimizedBuffer = await sharp(filePath)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const fileName = `${uuidv4()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tickets')
      .upload(fileName, optimizedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('tickets')
      .getPublicUrl(fileName);

    // Call OCR service
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const ocrResponse = await axios.post('http://localhost:5001/extract-text/', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    const extractedText = ocrResponse.data.text;
    console.log('OCR Result:', extractedText);

    // Parse ticket text
    const parsedFields = parseTicketText(extractedText);
    const fingerprint = generateFingerprint(parsedFields);

    // Create listing record in database
    const { data: listing, error: dbError } = await supabase
      .from('listings')
      .insert({
        ticket_id: uuidv4(),
        original_owner_id: userId,
        event_name: parsedFields.event_name || 'Unknown Event',
        section: parsedFields.section || '',
        row: parsedFields.row || '',
        seat_number: parsedFields.seat ? parseInt(parsedFields.seat) : null,
        status: 'active',
        date: parsedFields.event_date ? new Date(parsedFields.event_date) : null,
        price: parsedFields.price ? parseFloat(parsedFields.price.replace(/[^0-9.]/g, '')) : null,
        fixed_seating: true,
        category: 'ticket',
        image_url: publicUrl,
        parsed_fields: parsedFields,
        fingerprint: fingerprint,
        is_verified: false,
        verified_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        embedding: embedding
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Clean up temporary file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      listingId: listing.ticket_id,
      parsed: parsedFields,
      fingerprint,
      imageUrl: publicUrl
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process ticket upload',
      details: error.message 
    });
  }
});

// Get user's listings
router.get('/listings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('original_owner_id', userId)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    res.json({ listings });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch listings',
      details: error.message 
    });
  }
});

// Confirm listing (mark as verified)
router.post('/confirm-listing/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { userId } = req.body;

    // Verify user owns the listing
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('ticket_id', listingId)
      .eq('original_owner_id', userId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    // Update listing status
    const { data: updatedListing, error: updateError } = await supabase
      .from('listings')
      .update({
        status: 'active',
        is_verified: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('ticket_id', listingId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Update error: ${updateError.message}`);
    }

    res.json({ 
      success: true, 
      listing: updatedListing 
    });

  } catch (error) {
    console.error('Confirm listing error:', error);
    res.status(500).json({ 
      error: 'Failed to confirm listing',
      details: error.message 
    });
  }
});


// Delete listing
router.delete('/listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { userId } = req.body;

    // Verify user owns the listing
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('ticket_id', listingId)
      .eq('original_owner_id', userId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('listings')
      .delete()
      .eq('ticket_id', listingId);

    if (deleteError) {
      throw new Error(`Delete error: ${deleteError.message}`);
    }

    // Delete from storage (optional - you might want to keep images for audit)
    if (listing.image_url) {
      const fileName = listing.image_url.split('/').pop();
      await supabase.storage
        .from('tickets')
        .remove([fileName]);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ 
      error: 'Failed to delete listing',
      details: error.message 
    });
  }
});

// Resell ticket (transfer ownership)
router.post('/resell-ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { newOwnerId } = req.body;

    // Fetch the listing
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('ticket_id', ticketId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Update ownership
    const { data: updatedListing, error: updateError } = await supabase
      .from('listings')
      .update({
        original_owner_id: newOwnerId,
        new_owner_id: null, // Optionally clear new_owner_id after transfer
        updated_at: new Date().toISOString()
      })
      .eq('ticket_id', ticketId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Resale update error: ${updateError.message}`);
    }

    res.json({ success: true, listing: updatedListing });
  } catch (error) {
    console.error('Resell ticket error:', error);
    res.status(500).json({ error: 'Failed to resell ticket', details: error.message });
  }
});

module.exports = router; 