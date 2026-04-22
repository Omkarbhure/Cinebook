const User = require('../models/User');
const Movie = require('../models/Movie');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const Theater = require('../models/Theater');

exports.getDashboard = async (req, res) => {
  try {
    const [totalUsers, totalMovies, totalBookings, totalShows] = await Promise.all([
      User.countDocuments(),
      Movie.countDocuments(),
      Booking.countDocuments({ paymentStatus: 'paid' }),
      Show.countDocuments(),
    ]);

    const revenueResult = await Booking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    const recentBookings = await Booking.find({ paymentStatus: 'paid' })
      .populate('user movie')
      .sort({ createdAt: -1 })
      .limit(10);

    const topMovies = await Movie.find().sort({ totalBookings: -1 }).limit(5);

    res.json({ success: true, stats: { totalUsers, totalMovies, totalBookings, totalShows, totalRevenue }, recentBookings, topMovies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user movie')
      .populate({ path: 'show', populate: { path: 'theater' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTheater = async (req, res) => {
  try {
    const theater = await Theater.create(req.body);
    res.status(201).json({ success: true, theater });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllTheaters = async (req, res) => {
  try {
    const theaters = await Theater.find().sort({ city: 1 });
    res.json({ success: true, theaters });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
