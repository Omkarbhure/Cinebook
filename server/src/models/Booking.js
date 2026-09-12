const mongoose = require('mongoose');
const crypto   = require('crypto');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  seats: [{
    row: Number,
    col: Number,
    category: { type: String, enum: ['silver', 'gold', 'platinum'] },
    price: Number,
  }],
  totalAmount: { type: Number, required: true },
  convenienceFee: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: { type: String, enum: ['card', 'upi', 'wallet', 'netbanking', 'cinebook_wallet'], default: 'card' },
  bookingId: { type: String, unique: true },
  // High-entropy token embedded in the QR code for staff verification.
  // Separate from bookingId so the human-readable ID doesn't expose the secret.
  verifyToken: { type: String, unique: true, sparse: true },
  qrCode: { type: String, default: '' },
  status: { type: String, enum: ['confirmed', 'cancelled', 'used'], default: 'confirmed' },
}, { timestamps: true });

// Generate unique booking ID and high-entropy verify token
bookingSchema.pre('save', async function () {
  if (!this.bookingId) {
    this.bookingId = 'CB' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  if (!this.verifyToken) {
    // 32 random bytes → 64-char hex string (~1.16 × 10^77 combinations)
    this.verifyToken = crypto.randomBytes(32).toString('hex');
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
