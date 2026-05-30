const mongoose = require('mongoose');

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
  qrCode: { type: String, default: '' },
  status: { type: String, enum: ['confirmed', 'cancelled', 'used'], default: 'confirmed' },
}, { timestamps: true });

// Generate unique booking ID
bookingSchema.pre('save', async function () {
  if (!this.bookingId) {
    this.bookingId = 'CB' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
