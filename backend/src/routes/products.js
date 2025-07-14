require('dotenv').config();

const express = require('express');

// get square SDK
const { SquareClient, SquareEnvironment } = require("square");

const router = express.Router();

// initializing client
const client = new SquareClient({
    environment: process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    token: process.env.SQUARE_ACCESS_TOKEN  // Use 'token' not 'accessToken'
});

// Debug logging
console.log('Square Environment:', process.env.SQUARE_ENVIRONMENT);
console.log('Square Access Token exists:', process.env.SQUARE_ACCESS_TOKEN);
console.log('Client created:', !!client);
console.log('Available client methods:', Object.keys(client));

// API End points
// API endpoint to search for items
router.get('/search', async (req, res) => {
  try {
    const squareResponse = await client.catalog.searchItems({
      textFilter: req.query.query || 'milk',
      cursor: req.query.cursor || '',
    });

    // Extract name and all variations with prices
    const items = squareResponse.items?.map(item => {
      const itemData = item.itemData;
      
      const variations = itemData.variations?.map(variation => ({
        name: variation.itemVariationData.name,
        price: variation.itemVariationData.priceMoney?.amount 
          ? Number(variation.itemVariationData.priceMoney.amount)
          : null
      })) || [];

      return {
        name: itemData.name,
        variations: variations
      };
    }) || [];

    res.json(items);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search items' });
  }
});


module.exports = router;