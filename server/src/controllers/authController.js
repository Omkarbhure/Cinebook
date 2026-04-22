const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const twilio = require('twilio');
const admin = require('../config/firebase');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({ from: `"CineBook" <${process.env.EMAIL_USER}>`, to, subject, html });
};

// ─── Register ─────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const emailExists = await User.findOne({ email });
    const phoneExists = await User.findOne({ phone });

    if (emailExists && phoneExists) {
      return res.status(400).json({ success: false, message: 'Email and phone number are already registered.' });
    }
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'This email is already registered. Please sign in instead.' });
    }
    if (phoneExists) {
      return res.status(400).json({ success: false, message: 'This phone number is already registered. Please sign in instead.' });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({ name, email, password, phone, emailVerifyToken: verifyToken, isVerified: true });

    try {
      const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${verifyToken}&id=${user._id}`;
      await sendEmail({
        to: email,
        subject: '🎬 Verify Your CineBook Account',
        html: `<h2>Welcome to CineBook!</h2><p>Click below to verify your email:</p><a href="${verifyUrl}" style="background:#e50914;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Verify Email</a>`,
      });
    } catch (emailErr) {
      console.log('Skipping welcome email: Email service not configured.');
    }

    res.status(201).json({ success: true, message: 'Registered successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Verify Email ──────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const { token, id } = req.query;
    const user = await User.findById(id);
    if (!user || user.emailVerifyToken !== token)
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    user.isVerified = true;
    user.emailVerifyToken = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified! You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Login ─────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Google OAuth ──────────────────────────────────────────
exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const { name, email, picture, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (!user) {
      user = await User.create({ name, email, googleId, avatar: picture, isVerified: true });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.avatar = picture;
      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Send OTP ──────────────────────────────────────────────
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

    // 💡 Demo Mode: Bypass Twilio if credentials are placeholders
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID.startsWith('your_')) {
      console.log(`[DEMO MODE] OTP for ${phone} is 123456`);
      return res.json({ success: true, message: 'Demo OTP sent! Use 123456' });
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.verify.v2.services(process.env.TWILIO_VERIFY_SID).verifications.create({
      to: phone,
      channel: 'sms',
    });

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Verify OTP ────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });

    // 💡 Demo Mode: Bypass Twilio if credentials are placeholders
    let isApproved = false;
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID.startsWith('your_')) {
      if (otp === '123456') isApproved = true;
    } else {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const verification = await client.verify.v2.services(process.env.TWILIO_VERIFY_SID)
        .verificationChecks.create({ to: phone, code: otp });
      if (verification.status === 'approved') isApproved = true;
    }

    if (!isApproved) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ name: name || 'CineBook User', phone, isVerified: true });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, phone: user.phone, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyFirebase = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: 'ID Token required' });

    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, name, email, phone_number: phone, picture: avatar } = decodedToken;

    // Find user by googleId, email, or phone
    let user = await User.findOne({ 
      $or: [
        { googleId: uid }, 
        { email: email || 'undefined' }, 
        { phone: phone || 'undefined' }
      ] 
    });
    
    if (!user) {
      user = await User.create({ 
        name: name || 'CineBook User', 
        email, 
        phone, 
        googleId: uid,
        avatar,
        isVerified: true 
      });
    } else if (!user.googleId) {
      // Link Firebase to existing account if not already linked
      user.googleId = uid;
      if (avatar) user.avatar = avatar;
      await user.save();
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Firebase Verify Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No account with that email' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${resetToken}&id=${user._id}`;
    await sendEmail({
      to: email,
      subject: '🔐 Reset Your CineBook Password',
      html: `<h2>Password Reset</h2><p>This link expires in 30 minutes:</p><a href="${resetUrl}" style="background:#e50914;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset Password</a>`,
    });

    res.json({ success: true, message: 'Reset link sent to your email' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Reset Password ────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, id, password } = req.body;
    const user = await User.findById(id);
    if (!user || user.resetPasswordToken !== token || user.resetPasswordExpire < Date.now())
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Me ────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};
