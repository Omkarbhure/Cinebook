require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { startScheduler } = require('./services/showScheduler');

// Routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const showRoutes = require('./routes/shows');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const theaterRoutes = require('./routes/theaters');
const walletRoutes = require('./routes/wallet');

const app = express();

// Connect to MongoDB then start scheduler
connectDB().then(() => {
  startScheduler();
}).catch(() => {
  // connectDB handles its own error logging
});

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any vercel.app subdomain
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
// Handle preflight requests explicitly
app.options('*', cors(corsOptions));
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
app.use('/api/wallet', walletRoutes);

// 404 Handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global Error Handler — catches any unhandled errors thrown in routes/controllers
app.use((err, req, res, next) => {
  // Log full stack in development, just message in production
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unhandled error:', err.stack);
  } else {
    console.error('Unhandled error:', err.message);
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5MB.' });
  }

  // Multer file type error
  if (err.message === 'Only image files allowed') {
    return res.status(400).json({ success: false, message: 'Only image files are allowed.' });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
  }

  // Default — never expose raw stack traces in production
  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Something went wrong. Please try again.'
    : err.message || 'Internal server error';

  res.status(statusCode).json({ success: false, message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 CineBook Server running on http://localhost:${PORT}`));
