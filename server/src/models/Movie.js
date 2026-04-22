const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  genre: [String],
  languages: [String],
  duration: { type: Number, required: true }, // in minutes
  releaseDate: { type: Date, required: true },
  poster: { type: String, required: true },
  banner: { type: String, default: '' },
  cast: [{ name: String, role: String, photo: String }],
  director: { type: String },
  rating: { type: Number, default: 0, min: 0, max: 10 },
  trailerUrl: { type: String, default: '' },
  status: { type: String, enum: ['now_playing', 'upcoming', 'ended'], default: 'upcoming' },
  totalBookings: { type: Number, default: 0 },
}, { timestamps: true });

movieSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Movie', movieSchema);
