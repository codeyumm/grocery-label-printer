// get the environment file
require('dotenv').config();

// express 
const express = require('express');

// cors for Cross-Origin Resource Sharing
const cors = require('cors');

const path = require('path');

const productRoutes = require('./routes/products')

// get the express object
const app = express();

app.use(express.static(path.join(__dirname, '../frontend/rig-frontend/build')));

// define the port
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// enable cors
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}))

// Routes - Single mounting point
app.use('/api', productRoutes);

// route to check if server is running or not
app.get('/api/test-server', (req, res) => {
    res.json({status: 'Server is running'})
})

// to start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})