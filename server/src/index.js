require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const showRoutes = require('./routes/shows');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const theaterRoutes = require('./routes/theaters');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0a0a0f; color: white; height: 100vh;">
      <h1 style="color: #e50914; font-size: 48px;">🎬 CineBook API</h1>
      <p style="font-size: 20px; color: #a0a0a0;">The movie ticket engine is roaring! 🍿🚀</p>
      <div style="margin-top: 30px;">
        <a href="http://localhost:3000" style="background: #e50914; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Launch Website</a>
      </div>
    </div>
  `);
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: '🎬 CineBook API is running!', timestamp: new Date() }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/theaters', theaterRoutes);

// 404 Handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 CineBook Server running on http://localhost:${PORT}`));
