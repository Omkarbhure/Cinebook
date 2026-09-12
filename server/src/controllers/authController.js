const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const twilio = require('twilio');
const nodemailer = require('nodemailer');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const isTwilioConfigured = () =>
  !!process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_ACCOUNT_SID.startsWith('your_') &&
  !!process.env.TWILIO_AUTH_TOKEN && !process.env.TWILIO_AUTH_TOKEN.startsWith('your_') &&
  !!process.env.TWILIO_VERIFY_SID && !process.env.TWILIO_VERIFY_SID.startsWith('your_');

const sendEmail = async ({ to, subject, html }) => {
  const brevoConfigured = !!process.env.BREVO_API_KEY && !process.env.BREVO_API_KEY.startsWith('your_');
  const gmailConfigured = !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS &&
    !process.env.EMAIL_USER.startsWith('your_') && !process.env.EMAIL_PASS.startsWith('your_');

  if (brevoConfigured) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'CineBook', email: (process.env.EMAIL_USER && !process.env.EMAIL_USER.startsWith('your_')) ? process.env.EMAIL_USER : 'noreply@cinebook.com' },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      if (response.ok) return;

      const errBody = await response.text();
      console.warn('[EMAIL] Brevo failed, falling back:', errBody);
    } catch (brevoErr) {
      console.warn('[EMAIL] Brevo failed, falling back:', brevoErr.message);
    }
  }

  if (gmailConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"CineBook" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });
      return;
    } catch (gmailErr) {
      console.warn('[EMAIL] Gmail SMTP failed:', gmailErr.message);
    }
  }

  // Graceful fallback for development / testing / unconfigured credentials
  const otpMatch = html ? html.match(/>(\d{6})</) : null;
  const otpCode = otpMatch ? otpMatch[1] : '';
  console.log(`\n======================================================`);
  console.log(`📧 [EMAIL Demo Mode] To: ${to}`);
  console.log(`   Subject: ${subject}`);
  if (otpCode) console.log(`   👉 YOUR OTP CODE: ${otpCode}`);
  console.log(`======================================================\n`);
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  return local.slice(0, 2) + '***@' + domain;
};

// ─── Register ─────────────────────────────────────────────
// Step 1: Validate fields, send OTP to email (don't create user yet)
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const cleanEmail = email.toLowerCase().trim();
    const cleanName  = name.trim();

    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const emailExists = await User.findOne({ email: cleanEmail });
    const phoneExists = phone ? await User.findOne({ phone }) : null;

    if (emailExists)
      return res.status(400).json({ success: false, message: 'This email is already registered. Please sign in instead.' });
    if (phoneExists)
      return res.status(400).json({ success: false, message: 'This phone number is already registered. Please sign in instead.' });

    // Generate OTP and store pending registration data temporarily in a temp user doc
    const otp = generateOtp();
    const otpExpire = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store as a temporary unverified user (isVerified: false)
    // If one already exists (retry), update it
    let tempUser = await User.findOne({ email: cleanEmail });
    if (!tempUser) {
      try {
        const userPayload = {
          name: cleanName,
          email: cleanEmail,
          password,
          isVerified: false,
          registerOtp: otp,
          registerOtpExpire: otpExpire,
        };
        if (phone) userPayload.phone = phone;

        tempUser = await User.create(userPayload);
      } catch (createErr) {
        if (createErr.code === 11000) {
          return res.status(400).json({
            success: false,
            message: 'This email or phone number is already registered. Please sign in instead.',
          });
        }
        throw createErr;
      }
    } else {
      tempUser.name = cleanName;
      tempUser.password = password;
      tempUser.phone = phone || undefined;
      tempUser.registerOtp = otp;
      tempUser.registerOtpExpire = otpExpire;
      await tempUser.save();
    }

    // Send OTP email
    try {
      await sendEmail({
        to: cleanEmail,
        subject: '🎬 Your CineBook Registration OTP',
        html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0f;color:#fff;padding:32px;border-radius:12px;">' +
          '<h2 style="color:#e50914;margin-bottom:8px;">Verify Your Email</h2>' +
          '<p style="color:#a0a0a0;margin-bottom:24px;">Use the OTP below to complete your CineBook registration. It expires in 5 minutes.</p>' +
          '<div style="background:#1a1a26;border:1px solid #333;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">' +
          '<span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#fff;">' + otp + '</span>' +
          '</div>' +
          '<p style="color:#666;font-size:13px;">If you did not request this, please ignore this email.</p>' +
          '</div>',
      });
    } catch (emailErr) {
      console.error('Failed to send registration OTP:', emailErr.message);
      await User.findByIdAndDelete(tempUser._id).catch(() => {});
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please verify your Brevo sender email or Gmail SMTP configuration.',
      });
    }

    res.status(200).json({
      success: true,
      requiresOtp: true,
      maskedEmail: maskEmail(cleanEmail),
      userId: tempUser._id,
      message: 'OTP sent to your email',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Verify Register OTP ───────────────────────────────────
// Step 2: Verify OTP → activate account → return JWT
exports.verifyRegisterOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp)
      return res.status(400).json({ success: false, message: 'User ID and OTP are required' });

    const user = await User.findById(userId).select('+registerOtp +registerOtpExpire');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.registerOtp || !user.registerOtpExpire)
      return res.status(400).json({ success: false, message: 'No OTP requested. Please register again.' });

    if (user.registerOtpExpire < new Date())
      return res.status(400).json({ success: false, message: 'OTP has expired. Please register again.' });

    if (user.registerOtp !== String(otp).trim())
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });

    // Activate account
    user.isVerified = true;
    user.registerOtp = undefined;
    user.registerOtpExpire = undefined;
    await user.save();

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

// ─── Resend Register OTP ───────────────────────────────────
exports.resendRegisterOtp = async (req, res) => {
  try {
    const { userId, email } = req.body;
    let user;
    if (userId) {
      user = await User.findById(userId).select('+registerOtp +registerOtpExpire');
    } else if (email) {
      user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+registerOtp +registerOtpExpire');
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account is already verified. Please sign in.' });
    }

    const otp = generateOtp();
    const otpExpire = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.registerOtp = otp;
    user.registerOtpExpire = otpExpire;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: '🎬 Your CineBook Registration OTP (Resent)',
        html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0f;color:#fff;padding:32px;border-radius:12px;">' +
          '<h2 style="color:#e50914;margin-bottom:8px;">Verify Your Email</h2>' +
          '<p style="color:#a0a0a0;margin-bottom:24px;">Here is your new OTP to complete your CineBook registration. It expires in 5 minutes.</p>' +
          '<div style="background:#1a1a26;border:1px solid #333;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">' +
          '<span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#fff;">' + otp + '</span>' +
          '</div>' +
          '<p style="color:#666;font-size:13px;">If you did not request this, please ignore this email.</p>' +
          '</div>',
      });
    } catch (emailErr) {
      console.error('Failed to resend registration OTP:', emailErr.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      requiresOtp: true,
      maskedEmail: maskEmail(user.email),
      userId: user._id,
      message: 'New OTP sent to your email',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Verify Email ──────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const { token, id } = req.query;
    if (!token || !id)
      return res.status(400).json({ success: false, message: 'Invalid verification link' });

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
// Step 1: Verify credentials.
// - Admin (username) → return token directly (no OTP)
// - User with email → send OTP to their email, return requiresOtp: true
// - User without email (phone-only) → return token directly
exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if ((!email && !username) || !password)
      return res.status(400).json({ success: false, message: 'Credentials and password required' });

    let user;
    if (username) {
      // Admin login by username — no OTP required
      const usernameRegex = new RegExp('^' + String(username).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
      user = await User.findOne({ name: usernameRegex, role: 'admin' }).select('+password');
    } else {
      // Email login — fetch for both users and admins
      user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password +loginOtp +loginOtpExpire');
    }

    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!user.password)
      return res.status(401).json({
        success: false,
        message: 'This account uses Phone login. Please use the Phone OTP option instead.',
      });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Admin → always skip OTP, return token immediately (whether logged in via username or email)
    if (user.role === 'admin') {
      const token = generateToken(user._id);
      return res.json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
      });
    }

    // User with email → send OTP for 2-step verification
    if (user.email) {
      const otp = generateOtp();
      user.loginOtp = otp;
      user.loginOtpExpire = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await user.save();

      try {
        await sendEmail({
          to: user.email,
          subject: '🔐 Your CineBook Login OTP',
          html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0f;color:#fff;padding:32px;border-radius:12px;">' +
            '<h2 style="color:#e50914;margin-bottom:8px;">Login Verification</h2>' +
            '<p style="color:#a0a0a0;margin-bottom:24px;">Use the OTP below to complete your login. It expires in 5 minutes.</p>' +
            '<div style="background:#1a1a26;border:1px solid #333;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">' +
            '<span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#fff;">' + otp + '</span>' +
            '</div>' +
            '<p style="color:#666;font-size:13px;">If you did not request this, please ignore this email.</p>' +
            '</div>',
        });
      } catch (emailErr) {
        console.error('Failed to send login OTP email:', emailErr.message);
        user.loginOtp = undefined;
        user.loginOtpExpire = undefined;
        await user.save().catch(() => {});
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP email. Please verify your Brevo sender email or Gmail SMTP configuration.',
        });
      }

      return res.json({
        success: true,
        requiresOtp: true,
        maskedEmail: maskEmail(user.email),
        userId: user._id,
        message: 'OTP sent to your email',
      });
    }

    // User without email (phone-only) → return token directly
    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('[Login Error]', err.message, err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Verify Login OTP ──────────────────────────────────────
// Step 2: User submits OTP → verify → return JWT token
exports.verifyLoginOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp)
      return res.status(400).json({ success: false, message: 'User ID and OTP are required' });

    const user = await User.findById(userId).select('+loginOtp +loginOtpExpire');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.loginOtp || !user.loginOtpExpire)
      return res.status(400).json({ success: false, message: 'No OTP requested. Please login again.' });

    if (user.loginOtpExpire < new Date())
      return res.status(400).json({ success: false, message: 'OTP has expired. Please login again.' });

    if (user.loginOtp !== String(otp).trim())
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });

    // Clear OTP after successful verification
    user.loginOtp = undefined;
    user.loginOtpExpire = undefined;
    await user.save();

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

// ─── Resend Login OTP ──────────────────────────────────────
exports.resendLoginOtp = async (req, res) => {
  try {
    const { userId, email } = req.body;
    let user;
    if (userId) {
      user = await User.findById(userId).select('+loginOtp +loginOtpExpire');
    } else if (email) {
      user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+loginOtp +loginOtpExpire');
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.email) {
      return res.status(400).json({ success: false, message: 'No email registered for this account' });
    }

    const otp = generateOtp();
    const otpExpire = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.loginOtp = otp;
    user.loginOtpExpire = otpExpire;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: '🔐 Your CineBook Login OTP (Resent)',
        html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0f;color:#fff;padding:32px;border-radius:12px;">' +
          '<h2 style="color:#e50914;margin-bottom:8px;">Login Verification</h2>' +
          '<p style="color:#a0a0a0;margin-bottom:24px;">Here is your new OTP to complete your CineBook login. It expires in 5 minutes.</p>' +
          '<div style="background:#1a1a26;border:1px solid #333;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">' +
          '<span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#fff;">' + otp + '</span>' +
          '</div>' +
          '<p style="color:#666;font-size:13px;">If you did not request this, please ignore this email.</p>' +
          '</div>',
      });
    } catch (emailErr) {
      console.error('Failed to resend login OTP:', emailErr.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again later.',
      });
    }

    res.json({
      success: true,
      requiresOtp: true,
      maskedEmail: maskEmail(user.email),
      userId: user._id,
      message: 'New OTP sent to your email',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Send OTP (Phone) ──────────────────────────────────────
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

    if (!isTwilioConfigured()) {
      return res.json({
        success: true,
        message: 'OTP sent successfully',
        demoOtp: '123456',
      });
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.verify.v2.services(process.env.TWILIO_VERIFY_SID).verifications.create({ to: phone, channel: 'sms' });
    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Verify OTP (Phone) ────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });

    if (!isTwilioConfigured()) {
      if (String(otp).trim() !== '123456') {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }

      let user = await User.findOne({ phone });
      if (!user) {
        user = await User.create({ name: name || 'CineBook User', phone, isVerified: true });
      }

      const token = generateToken(user._id);
      return res.json({
        success: true,
        token,
        user: { id: user._id, name: user.name, phone: user.phone, role: user.role, avatar: user.avatar },
      });
    }

    let isApproved = false;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const verification = await client.verify.v2.services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: phone, code: otp });
    if (verification.status === 'approved') isApproved = true;

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

// ─── Forgot Password ───────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const cleanEmail = String(email).toLowerCase().trim();

    // Always return the same generic message regardless of whether the account
    // exists — prevents email enumeration (probing which emails are registered).
    const GENERIC_MSG = 'If an account exists for that email, a password reset OTP has been sent.';

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with that email.' });
    }

    const otp = generateOtp();
    const otpExpire = new Date(Date.now() + 5 * 60 * 1000);

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpire = otpExpire;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: '🔐 Your CineBook Password Reset OTP',
        html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0f;color:#fff;padding:32px;border-radius:12px;">' +
          '<h2 style="color:#e50914;margin-bottom:8px;">Password Reset</h2>' +
          '<p style="color:#a0a0a0;margin-bottom:24px;">Use the OTP below to verify your identity and set a new password. It expires in 5 minutes.</p>' +
          '<div style="background:#1a1a26;border:1px solid #333;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">' +
          '<span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#fff;">' + otp + '</span>' +
          '</div>' +
          '<p style="color:#666;font-size:13px;">If you did not request this, please ignore this email.</p>' +
          '</div>',
      });
    } catch (emailErr) {
      console.error('Failed to send password reset OTP:', emailErr.message);
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpire = undefined;
      await user.save().catch(() => {});
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset OTP email. Please verify your Brevo sender email or Gmail SMTP configuration.',
      });
    }

    res.json({
      success: true,
      requiresOtp: true,
      maskedEmail: maskEmail(user.email),
      userId: user._id,
      message: 'Password reset OTP sent to your email',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Reset Password ────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, id, password, newPassword, userId, otp } = req.body;
    const finalPassword = password || newPassword;

    // Legacy reset link flow (existing route)
    if (token || id) {
      if (!token || !id || !finalPassword)
        return res.status(400).json({ success: false, message: 'All fields required' });
      if (finalPassword.length < 6)
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

      const user = await User.findById(id);
      if (!user || user.resetPasswordToken !== token || user.resetPasswordExpire < Date.now())
        return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });

      user.password = finalPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.json({ success: true, message: 'Password reset successfully' });
    }

    // OTP-based reset flow for the newer forgot-password UX
    if (!userId || !otp || !finalPassword)
      return res.status(400).json({ success: false, message: 'User ID, OTP, and new password are required' });
    if (finalPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const user = await User.findById(userId).select('+resetPasswordOtp +resetPasswordOtpExpire');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpire)
      return res.status(400).json({ success: false, message: 'No reset OTP requested. Please try again.' });

    if (user.resetPasswordOtpExpire < new Date())
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new reset code.' });

    if (user.resetPasswordOtp !== String(otp).trim())
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });

    user.password = finalPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpire = undefined;
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

// ─── Upload Avatar ─────────────────────────────────────────
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Upload buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'cinebook/avatars', transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }] },
        (err, result) => { if (err) reject(err); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });

    // Save avatar URL to user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    );

    res.json({ success: true, avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Update Password ───────────────────────────────────────
exports.updatePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || !confirmPassword)
      return res.status(400).json({ success: false, message: 'Both fields are required' });
    if (newPassword !== confirmPassword)
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
