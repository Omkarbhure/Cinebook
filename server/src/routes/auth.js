const express = require('express');
const router = express.Router();
const { register, login, googleAuth, sendOtp, verifyOtp, verifyFirebase, forgotPassword, resetPassword, verifyEmail, getMe } = require('../controllers/authController');

router.post('/verify-firebase', verifyFirebase);
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
