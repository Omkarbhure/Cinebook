require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { startScheduler } = require('./services/showScheduler');
const { seedAllCities }  = require('./services/citySeeder');

// Routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const showRoutes = require('./routes/shows');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const theaterRoutes = require('./routes/theaters');
const walletRoutes = require('./routes/wallet');

const app = express();

// Trust Render's proxy (required for rate limiting and IP detection)
app.set('trust proxy', 1);

// Connect to MongoDB then start scheduler
connectDB().then(async (conn) => {
  if (conn) {
    try {
      await seedAllCities();
      startScheduler();
    } catch (e) {
      console.error('[Startup] Seeder warning:', e.message);
    }
  }
}).catch(err => console.error('[Startup] DB connection failed:', err.message));

// Middleware
// Build explicit allow-list from env vars
const allowedOrigins = [
  ...( process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
        : [] ),
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
].filter(Boolean);

// Preflight fallback — ensures OPTIONS requests never get blocked
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// HTTP Security Headers (X-Content-Type-Options, Frameguard, XSS filter, CSP)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// Express 5 compatible NoSQL Injection Sanitizer
const sanitizeNoSql = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeNoSql(obj[key]);
    }
  }
  return obj;
};

app.use((req, res, next) => {
  if (req.body) sanitizeNoSql(req.body);
  if (req.params) sanitizeNoSql(req.params);
  next();
});

// Global General API Rate Limiter
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalApiLimiter);

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

const mongoose = require('mongoose');

// API Readiness & DB Check Middleware
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is currently connecting or offline. Please check MongoDB configuration.',
      movies: [],
      shows: [],
      theaters: [],
      users: []
    });
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => res.json({
  status: '🎬 CineBook API is running!',
  dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  timestamp: new Date()
}));

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
