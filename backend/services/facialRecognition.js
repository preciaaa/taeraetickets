// FACIAL COMPARISON
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/compare-faces', async (req, res) => {
  const { userId, liveEmbedding } = req.body;

  if (!userId || !liveEmbedding) {
    return res.status(400).json({ error: 'userId and liveEmbedding are required.' });
  }

  try {
    // Call user service to get stored embedding
    // Replace axios.get(`http://localhost:3000/users/${userId}`) with Supabase Auth API call if user info is needed
    const userResponse = await axios.get(`http://localhost:3000/users/${userId}`);
    const storedEmbeddingRaw = userResponse.data?.face_embedding;

    if (!storedEmbeddingRaw) {
      return res.status(404).json({ error: 'No stored embedding found for user.' });
    }

    let storedEmbedding = storedEmbeddingRaw;

    // Parse stored embedding if it's a string
    if (typeof storedEmbedding === 'string') {
      storedEmbedding = JSON.parse(storedEmbedding);
    }

    // Validate embedding arrays
    if (!Array.isArray(storedEmbedding) || !Array.isArray(liveEmbedding)) {
      return res.status(400).json({ error: 'Embeddings must be arrays.' });
    }
    if (storedEmbedding.length !== liveEmbedding.length) {
      return res.status(400).json({ error: 'Embedding vectors must be the same length.' });
    }

    // Compute Euclidean distance
    const distance = computeEuclideanDistance(storedEmbedding, liveEmbedding);
    const similarityThreshold = 0.6;
    const match = distance < similarityThreshold;

    // Update verification if matched
    if (match) {
      try {
        // Replace axios.post(`http://localhost:3000/users/${userId}/verification`, { verified: true }) with appropriate Supabase Auth API call or remove if not needed
      } catch (updateError) {
        console.error('Failed to update verification:', updateError);
        // Optionally you can respond with an error here or just log and continue
      }
    }

    res.json({ match, distance });

  } catch (error) {
    console.error('Facial comparison error:', error);
    res.status(error.response?.status || 500).json({ error: error.message || 'Facial comparison failed' });
  }
});

function computeEuclideanDistance(arr1, arr2) {
  return Math.sqrt(arr1.reduce((sum, val, i) => sum + Math.pow(val - arr2[i], 2), 0));
}

module.exports = router;