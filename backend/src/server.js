// get the envrionment file
require('dotenv').config();

// express 
const express = require('express');


// cors for Cross-Origin Resource Sharing
const cors = require('cors');


const path = require('path');

const productRoutes = require('./routes/products')

// get the express object
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

// define the port
const PORT = process.env.PORT || 3000;

// enable cors
app.use(cors())

// Routes
app.use('/api/products', productRoutes);

// route to check if server is running or not
app.get('/api/test-server', (req, res) => {
    res.json({status: 'Server is running'})
})

// to start the server
app.listen(PORT, () => {
    console.log(`Server is running on ${process.env.BASE_URL}:${PORT}`)
})
