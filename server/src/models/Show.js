const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  row: { type: Number, required: true },
  col: { type: Number, required: true },
  category: { type: String, enum: ['silver', 'gold', 'platinum'], default: 'silver' },
  // Permanent booking
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  // Temporary lock while user is in payment flow (expires after 10 minutes)
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lockedUntil: { type: Date, default: null },
}, { _id: false });

const showSchema = new mongoose.Schema({
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  theater: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // e.g. "10:00 AM"
  language: { type: String, default: 'English' },
  format: { type: String, enum: ['2D', '3D', 'IMAX', '4DX'], default: '2D' },
  pricing: {
    silver: { type: Number, default: 150 },
    gold: { type: Number, default: 250 },
    platinum: { type: Number, default: 400 },
  },
  seats: [seatSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Show', showSchema);
