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
    const response = await client.catalog.searchItems({
      textFilter: 'milk',
      cursor: '',
    });

    let res = response



response.items.forEach(item => {
  const itemData = item.itemData;

  console.log('Item Name:', itemData.name);


  // access variations inside itemData
  if (itemData.variations) {
  

    itemData.variations.forEach(variation => {

      const variationData = variation.itemVariationData;
      console.log('Price (in cents):', variationData.priceMoney?.amount);

    });
  }
});

    
    res.json(response.result); // send response once
  } catch (error) {
    console.error('Error calling Square API:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to fetch catalog items' });
    }
  }
});


module.exports = router;