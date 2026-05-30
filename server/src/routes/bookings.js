const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  createBooking, getMyBookings, getBookingById, cancelBooking,
  verifyBooking, lockSeats, unlockSeats,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// Rate limit QR verify endpoint — prevents booking ID enumeration
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many verification requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit booking creation — max 5 bookings per minute per user
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many booking attempts. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public verify route — no auth needed (theater staff scans QR)
router.get('/verify/:bookingId', verifyLimiter, verifyBooking);

router.use(protect); // All routes below require auth
router.post('/', bookingLimiter, createBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBookingById);
router.put('/:id/cancel', cancelBooking);

// Seat locking
router.post('/lock', lockSeats);
router.post('/unlock', unlockSeats);

module.exports = router;
