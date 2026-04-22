const mongoose = require('mongoose');

const theaterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  rows: { type: Number, required: true },
  cols: { type: Number, required: true },
  facilities: [String],
  rating: { type: Number, default: 0 },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true // [longitude, latitude]
    }
  },
  placeId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

theaterSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Theater', theaterSchema);
