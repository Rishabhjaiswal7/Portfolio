require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS configuration
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5500';
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowedOrigins = [allowedOrigin, 'http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:5000', 'http://127.0.0.1:5000'];
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve client assets statically
app.use(express.static(path.join(__dirname, '../client')));

// Catch-all to serve index.html for undefined frontend routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(500).json({ message: err.message || 'An unexpected error occurred on the server.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
