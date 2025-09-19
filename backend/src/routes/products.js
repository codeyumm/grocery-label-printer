require('dotenv').config();
const express = require('express');
const { SquareClient, SquareEnvironment } = require("square");
const router = express.Router();

// Store-specific route handler
router.get('/stores/:storeId/products/search', async (req, res) => {
    const { storeId } = req.params;
    const { query } = req.query;

    try {
        // Validate store ID
        if (!['erinmills', 'castlemore'].includes(storeId)) {
            return res.status(400).json({ error: 'Invalid store ID' });
        }

        // Select appropriate access token based on store
        let accessToken;
        if (storeId === 'erinmills') {
            accessToken = process.env.STORE1_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
        } else if (storeId === 'castlemore') {
            accessToken = process.env.STORE2_ACCESS_TOKEN;
        }

        if (!accessToken) {
            console.error(`No access token found for store: ${storeId}`);
            return res.status(500).json({ error: `Store ${storeId} not configured` });
        }

        console.log(`\n=== STORE-SPECIFIC SEARCH ===`);
        console.log(`Store: ${storeId}`);
        console.log(`Query: ${query}`);
        console.log(`Access Token: ${accessToken.substring(0, 10)}...`);

        // Initialize Square client with store-specific token (using your working pattern)
        const client = new SquareClient({
            environment: process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
            token: accessToken
        });

        // Use your exact working Square API call
        const squareResponse = await client.catalog.searchItems({
            textFilter: query || '',
            cursor: req.query.cursor || '',
        });

        console.log(`Square API response: Found ${squareResponse.items?.length || 0} items`);

        // Use your exact working data processing logic
        const items = squareResponse.items?.map(item => {
            const itemData = item.itemData;
            
            const variations = itemData.variations?.map(variation => ({
                name: variation.itemVariationData.name,
                barcode: variation.itemVariationData?.upc || null,
                price: variation.itemVariationData.priceMoney?.amount 
                    ? Number(variation.itemVariationData.priceMoney.amount)
                    : null
            })) || [];
            
            return {
                id: item.id, // Add id for compatibility
                name: itemData.name,
                variations: variations,
                store: storeId // Add store identifier
            };
        }) || [];

        console.log(`Found ${items.length} items for store ${storeId}`);
        res.json(items);

    } catch (error) {
        console.error('Search error for store', storeId, ':', error);
        console.error('Full Square Error:', JSON.stringify(error, null, 2));
        res.status(500).json({ 
            error: 'Failed to search items',
            store: storeId,
            details: error.message 
        });
    }
});

// Legacy route - keep your exact working code
router.get('/products/search', async (req, res) => {
    try {
        // Use default store token
        const accessToken = process.env.STORE1_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
        
        if (!accessToken) {
            return res.status(500).json({ error: 'Store not configured' });
        }

        console.log('\n=== LEGACY SEARCH (DEFAULT STORE) ===');
        console.log('Query:', req.query.query);

        const client = new SquareClient({
            environment: process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
            token: accessToken
        });

        const squareResponse = await client.catalog.searchItems({
            textFilter: req.query.query || '',
            cursor: req.query.cursor || '',
        });

        // Extract name and all variations with prices (your exact working logic)
        const items = squareResponse.items?.map(item => {
            const itemData = item.itemData;
            
            const variations = itemData.variations?.map(variation => ({
                name: variation.itemVariationData.name,
                barcode: variation.itemVariationData?.upc || null,
                price: variation.itemVariationData.priceMoney?.amount 
                    ? Number(variation.itemVariationData.priceMoney.amount)
                    : null
            })) || [];
            
            return {
                name: itemData.name,
                variations: variations,
                store: 'erinmills' // Add store identifier for legacy
            };
        }) || [];

        res.json(items);
    } catch (error) {
        console.error('Search error:', error);
        console.error('Full Square Error:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: 'Failed to search items' });
    }
});

// Keep compatibility with old /search route (your exact working code)
router.get('/search', async (req, res) => {
    try {
        const client = new SquareClient({
            environment: process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
            token: process.env.SQUARE_ACCESS_TOKEN
        });

        const squareResponse = await client.catalog.searchItems({
            textFilter: req.query.query || 'milk',
            cursor: req.query.cursor || '',
        });

        // Extract name and all variations with prices
        const items = squareResponse.items?.map(item => {
            const itemData = item.itemData;
            
            const variations = itemData.variations?.map(variation => ({
                name: variation.itemVariationData.name,
                barcode: variation.itemVariationData?.upc || null,
                price: variation.itemVariationData.priceMoney?.amount 
                    ? Number(variation.itemVariationData.priceMoney.amount)
                    : null
            })) || [];
            
            return {
                name: itemData.name,
                variations: variations,
            };
        }) || [];

        res.json(items);
    } catch (error) {
        console.error('Search error:', error);
        console.error('Full Square Error:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: 'Failed to search items' });
    }
});

module.exports = router;