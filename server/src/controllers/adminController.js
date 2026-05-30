const User = require('../models/User');
const Movie = require('../models/Movie');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const Theater = require('../models/Theater');
const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({ from: `"CineBook Admin" <${process.env.EMAIL_USER}>`, to, subject, html });
  } catch (err) {
    console.log('Email notification skipped:', err.message);
  }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
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
      .populate({ path: 'show', populate: { path: 'theater' } })
      .sort({ createdAt: -1 })
      .limit(10);

    const topMovies = await Movie.find().sort({ totalBookings: -1 }).limit(5);

    // Theater-wise booking stats
    const theaterStats = await Booking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $lookup: { from: 'shows', localField: 'show', foreignField: '_id', as: 'showData' } },
      { $unwind: '$showData' },
      { $lookup: { from: 'theaters', localField: 'showData.theater', foreignField: '_id', as: 'theaterData' } },
      { $unwind: '$theaterData' },
      { $group: {
        _id: '$theaterData._id',
        theaterName: { $first: '$theaterData.name' },
        city: { $first: '$theaterData.city' },
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        totalSeats: { $sum: { $size: '$seats' } },
      }},
      { $sort: { totalRevenue: -1 } },
    ]);

    res.json({ success: true, stats: { totalUsers, totalMovies, totalBookings, totalShows, totalRevenue }, recentBookings, topMovies, theaterStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Users ────────────────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.userId })
      .populate({ path: 'show', populate: { path: 'theater' } })
      .populate('movie')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
exports.getAllBookings = async (req, res) => {
  try {
    const { theater, movie, status, date } = req.query;

    // Build filter via show lookup
    let bookingFilter = {};
    if (status) bookingFilter.status = status;

    // Date filter on booking createdAt
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      bookingFilter.createdAt = { $gte: start, $lte: end };
    }

    // Movie filter
    if (movie) bookingFilter.movie = movie;

    let bookings = await Booking.find(bookingFilter)
      .populate('user movie')
      .populate({ path: 'show', populate: { path: 'theater' } })
      .sort({ createdAt: -1 });

    // Theater filter (post-populate)
    if (theater) {
      bookings = bookings.filter(b => b.show?.theater?._id?.toString() === theater);
    }

    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminCancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('user movie');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status === 'cancelled')
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' });

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

    // Free up seats using atomic updateOne (same as user cancel)
    const show = await Show.findById(booking.show);
    if (show) {
      for (const seat of booking.seats) {
        await Show.updateOne(
          { _id: show._id },
          {
            $set: {
              'seats.$[elem].userId': null,
              'seats.$[elem].bookingId': null,
              'seats.$[elem].lockedBy': null,
              'seats.$[elem].lockedUntil': null,
            },
          },
          { arrayFilters: [{ 'elem.row': seat.row, 'elem.col': seat.col }] }
        );
      }
    }

    // Refund to wallet
    try {
      const { refundWallet } = require('./walletController');
      await refundWallet(
        booking.user._id || booking.user,
        booking.totalAmount,
        'Admin refund for booking ' + booking.bookingId
      );
    } catch (walletErr) {
      console.warn('Admin wallet refund failed:', walletErr.message);
    }

    // Decrement movie booking count
    const Movie = require('../models/Movie');
    await Movie.findByIdAndUpdate(booking.movie?._id || booking.movie, {
      $inc: { totalBookings: -booking.seats.length }
    }).catch(() => {});

    res.json({ success: true, message: 'Booking cancelled and refunded to wallet' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Theaters ─────────────────────────────────────────────────────────────────
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
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const city  = req.query.city || '';

    const filter = city ? { city: new RegExp('^' + city + '$', 'i') } : {};
    const total  = await Theater.countDocuments(filter);
    const theaters = await Theater.find(filter)
      .sort({ city: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const theaterIds = theaters.map(t => t._id);

    // Batch aggregations — fast even with many theaters
    const [showCounts, bookingStats] = await Promise.all([
      Show.aggregate([
        { $match: { theater: { $in: theaterIds } } },
        { $group: { _id: '$theater', count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $lookup: { from: 'shows', localField: 'show', foreignField: '_id', as: 'sd' } },
        { $unwind: { path: '$sd', preserveNullAndEmptyArrays: true } },
        { $match: { 'sd.theater': { $in: theaterIds } } },
        { $group: {
          _id: '$sd.theater',
          bookingCount: { $sum: 1 },
          revenue:      { $sum: '$totalAmount' },
          totalSeats:   { $sum: { $size: '$seats' } },
        }},
      ]),
    ]);

    const showMap   = Object.fromEntries(showCounts.map(s => [s._id.toString(), s.count]));
    const bookMap   = Object.fromEntries(bookingStats.map(b => [b._id?.toString(), b]));

    const theatersWithStats = theaters.map(t => ({
      ...t._doc,
      showCount:    showMap[t._id.toString()] || 0,
      bookingCount: bookMap[t._id.toString()]?.bookingCount || 0,
      revenue:      bookMap[t._id.toString()]?.revenue || 0,
      totalSeats:   bookMap[t._id.toString()]?.totalSeats || 0,
    }));

    res.json({ success: true, theaters: theatersWithStats, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTheaterShows = async (req, res) => {
  try {
    const shows = await Show.find({ theater: req.params.theaterId })
      .populate('movie')
      .sort({ date: 1, time: 1 });

    const showsWithStats = shows.map(show => {
      const totalSeats = show.seats.length;
      const bookedSeats = show.seats.filter(s => s.userId).length;
      return {
        ...show._doc,
        totalSeats,
        bookedSeats,
        availableSeats: totalSeats - bookedSeats,
      };
    });

    // Sort: most booked first
    showsWithStats.sort((a, b) => b.bookedSeats - a.bookedSeats);

    res.json({ success: true, shows: showsWithStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getShowSeatMap = async (req, res) => {
  try {
    const show = await Show.findById(req.params.showId)
      .populate('movie theater')
      .populate('seats.userId', 'name email phone') // populate user info on booked seats
      .populate('seats.lockedBy', 'name');           // populate lock holder name

    if (!show) return res.status(404).json({ success: false, message: 'Show not found' });

    const now = new Date();
    const totalSeats = show.seats.length;
    const bookedSeats = show.seats.filter(s => s.userId).length;
    const lockedSeats = show.seats.filter(s => s.lockedBy && s.lockedUntil > now && !s.userId).length;

    // Build enriched seat list for admin view
    const enrichedSeats = show.seats.map(seat => ({
      row: seat.row,
      col: seat.col,
      category: seat.category,
      // Booking info
      userId: seat.userId?._id || seat.userId || null,
      userName: seat.userId?.name || null,
      userEmail: seat.userId?.email || seat.userId?.phone || null,
      bookingId: seat.bookingId,
      // Lock info
      lockedBy: seat.lockedBy?._id || seat.lockedBy || null,
      lockedByName: seat.lockedBy?.name || null,
      lockedUntil: seat.lockedUntil,
      isLocked: !!(seat.lockedBy && seat.lockedUntil > now && !seat.userId),
    }));

    res.json({
      success: true,
      show: {
        ...show._doc,
        seats: enrichedSeats,
        totalSeats,
        bookedSeats,
        lockedSeats,
        availableSeats: totalSeats - bookedSeats - lockedSeats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Email notification on new booking (called from bookingController) ────────
exports.notifyAdminNewBooking = async (booking) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  await sendEmail({
    to: process.env.EMAIL_USER,
    subject: `🎟️ New Booking — ${booking.bookingId}`,
    html: `
      <div style="font-family:sans-serif;background:#0a0a0f;color:#fff;padding:32px;border-radius:12px;">
        <h2 style="color:#e50914;">New Booking Received</h2>
        <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
        <p><strong>User:</strong> ${booking.user?.name || 'N/A'} (${booking.user?.email || booking.user?.phone || 'N/A'})</p>
        <p><strong>Movie:</strong> ${booking.movie?.title || 'N/A'}</p>
        <p><strong>Seats:</strong> ${booking.seats?.length || 0}</p>
        <p><strong>Amount:</strong> ₹${booking.totalAmount}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN')}</p>
      </div>
    `,
  });
};
