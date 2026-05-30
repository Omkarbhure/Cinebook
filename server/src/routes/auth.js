const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  register, verifyRegisterOtp, login, verifyLoginOtp,
  googleAuth, sendOtp, verifyOtp, verifyFirebase,
  forgotPassword, resetPassword, verifyEmail,
  getMe, uploadAvatar, updatePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// ── Rate limiters ────────────────────────────────────────────
// Login attempts — 20 per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Google / Firebase — more lenient, 30 per 15 min (popup can fire multiple times)
const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many Google login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP endpoints — 10 per 10 min per IP
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many OTP requests. Please wait 10 minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration — 10 per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many registration attempts. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Public routes ────────────────────────────────────────────
router.post('/register', registerLimiter, register);
router.post('/verify-register-otp', otpLimiter, verifyRegisterOtp);
router.get('/verify-email', verifyEmail);
router.post('/login', loginLimiter, login);
router.post('/verify-login-otp', otpLimiter, verifyLoginOtp);
router.post('/google', googleLimiter, googleAuth);
router.post('/verify-firebase', googleLimiter, verifyFirebase);
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', otpLimiter, verifyOtp);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

// ── Protected routes ─────────────────────────────────────────
router.get('/me', protect, getMe);
router.post('/upload-avatar', protect, upload.single('avatar'), uploadAvatar);
router.put('/update-password', protect, updatePassword);

module.exports = router;
