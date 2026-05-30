const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  password: { type: String, select: false },
  phone: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  googleId: { type: String, unique: true, sparse: true },
  avatar: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  emailVerifyToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  loginOtp: { type: String, select: false },
  loginOtpExpire: { type: Date, select: false },
  registerOtp: { type: String, select: false },
  registerOtpExpire: { type: Date, select: false },
  pendingRegistration: { type: Object, select: false },
  // Wallet
  walletBalance: { type: Number, default: 0 },
  walletTransactions: [{
    type:        { type: String, enum: ['credit', 'debit'], required: true },
    amount:      { type: Number, required: true },
    description: { type: String, required: true },
    date:        { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function (entered) {
  if (!this.password) return false; // Account has no password (e.g. Google-only)
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
