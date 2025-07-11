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

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/octet-stream'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image files or PDFs are allowed'), false);
    }
  }
});

router.post('/upload-ticket', upload.single('ticket'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const isPdf = req.file.mimetype === 'application/pdf';
    let embedding = null;
    let publicUrl = null;
    let uploadBuffer = req.file.buffer;
    let fileName;

    if (!isPdf) {
      // Check for duplicate image using deduplication service
      const dedupFormData = new FormData();
      dedupFormData.append('image', Buffer.from(uploadBuffer), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      const dedupResponse = await axios.post('http://localhost:5002/check-duplicate', dedupFormData, {
        headers: dedupFormData.getHeaders(),
      });
      embedding = dedupResponse.data.embedding;

      // Query Supabase for similar embeddings (vector search)
      const { data: similarListings, error: matchError } = await supabase.rpc('match_embedding', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 1
      });
      if (matchError) {
        console.error('Error querying for similar embeddings:', matchError);
      }
      if (similarListings && similarListings.length > 0) {
        return res.status(409).json({ error: 'Duplicate ticket image detected (DB check). Listing not created.' });
      }

      const optimizedBuffer = await sharp(uploadBuffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      fileName = `${uuidv4()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(fileName, optimizedBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });
      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
      publicUrl = supabase.storage
        .from('tickets')
        .getPublicUrl(fileName).data.publicUrl;
    } else {
      fileName = `${uuidv4()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(fileName, uploadBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600'
        });
      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
      publicUrl = supabase.storage
        .from('tickets')
        .getPublicUrl(fileName).data.publicUrl;
    }

    // Use Mistral.ai OCR service
    const formData = new FormData();
    formData.append('file', Buffer.from(uploadBuffer), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    const ocrResponse = await axios.post('http://localhost:5001/extract-text/', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 120000 // 2 minute timeout for large files
    });

    const extractedText = ocrResponse.data.text;
    const isScanned = ocrResponse.data.is_scanned || false;
    console.log('OCR Result:', extractedText);
    console.log('Is Scanned:', isScanned);

    // Parse ticket text
    let parsedFields = {};
    if (isScanned || !extractedText || extractedText.trim() === '') {
      // For scanned PDFs or when no text is extracted, use default values
      parsedFields = {
        event_name: 'Scanned Ticket - Manual Entry Required',
        section: '',
        row: '',
        seat: '',
        event_date: '',
        price: '',
        venue: ''
      };
    } else {
      parsedFields = parseTicketText(extractedText);
    }
    
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

    res.json({
      success: true,
      listingId: listing.ticket_id,
      parsed: parsedFields,
      fingerprint,
      imageUrl: publicUrl,
      isScanned: isScanned,
      extractedText: extractedText
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

module.exports = router; 