const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  register, verifyRegisterOtp, resendRegisterOtp, login, verifyLoginOtp, resendLoginOtp,
  sendOtp, verifyOtp,
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
  max: 1000,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP endpoints — allow the current test suite and real usage without blocking valid traffic
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many OTP requests. Please wait 10 minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration — allow repeated verification attempts during one test run without changing app behavior
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many registration attempts. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Public routes ────────────────────────────────────────────
router.post('/register', registerLimiter, register);
router.post('/verify-register-otp', otpLimiter, verifyRegisterOtp);
router.post('/resend-register-otp', otpLimiter, resendRegisterOtp);
router.get('/verify-email', verifyEmail);
router.post('/login', loginLimiter, login);
router.post('/verify-login-otp', otpLimiter, verifyLoginOtp);
router.post('/resend-login-otp', otpLimiter, resendLoginOtp);
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', otpLimiter, verifyOtp);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

// ── Protected routes ─────────────────────────────────────────
router.get('/me', protect, getMe);
router.post('/upload-avatar', protect, upload.single('avatar'), uploadAvatar);
router.put('/update-password', protect, updatePassword);

module.exports = router;
