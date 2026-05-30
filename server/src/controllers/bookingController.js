const Booking = require('../models/Booking');
const Show = require('../models/Show');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const { notifyAdminNewBooking } = require('./adminController');
const { deductWallet, refundWallet } = require('./walletController');

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// ─── Lock Seats (called when user selects seats) ──────────
exports.lockSeats = async (req, res) => {
  try {
    const { showId, seats } = req.body;
    if (!showId || !seats || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const now = new Date();
    const lockExpiry = new Date(now.getTime() + LOCK_DURATION_MS);

    const show = await Show.findById(showId);
    if (!show) return res.status(404).json({ success: false, message: 'Show not found' });

    // Validate all seats are lockable before locking any
    for (const s of seats) {
      const seat = show.seats.find(seat => seat.row === s.row && seat.col === s.col);
      if (!seat) return res.status(400).json({ success: false, message: 'Seat ' + String.fromCharCode(65 + s.row) + (s.col + 1) + ' does not exist' });
      if (seat.userId) return res.status(400).json({ success: false, message: 'Seat ' + String.fromCharCode(65 + s.row) + (s.col + 1) + ' is already booked' });
      if (seat.lockedBy && seat.lockedBy.toString() !== req.user._id.toString() && seat.lockedUntil > now) {
        return res.status(409).json({
          success: false,
          message: 'Seat ' + String.fromCharCode(65 + s.row) + (s.col + 1) + ' is temporarily held by another user. Please try again in a few minutes.',
        });
      }
    }

    // Lock each seat atomically
    for (const s of seats) {
      await Show.updateOne(
        {
          _id: showId,
          seats: {
            $elemMatch: {
              row: s.row, col: s.col, userId: null,
              $or: [{ lockedBy: null }, { lockedUntil: { $lt: now } }, { lockedBy: req.user._id }],
            },
          },
        },
        {
          $set: {
            'seats.$[elem].lockedBy': req.user._id,
            'seats.$[elem].lockedUntil': lockExpiry,
          },
        },
        { arrayFilters: [{ 'elem.row': s.row, 'elem.col': s.col }] }
      );
    }

    res.json({ success: true, message: 'Seats locked for 10 minutes', lockedUntil: lockExpiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Unlock Seats (called when user cancels payment or deselects) ─────────────
exports.unlockSeats = async (req, res) => {
  try {
    const { showId, seats } = req.body;
    if (!showId || !seats || !Array.isArray(seats)) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    for (const s of seats) {
      await Show.updateOne(
        {
          _id: showId,
          seats: {
            $elemMatch: {
              row: s.row,
              col: s.col,
              lockedBy: req.user._id, // only unlock your own locks
            },
          },
        },
        {
          $set: {
            'seats.$[elem].lockedBy': null,
            'seats.$[elem].lockedUntil': null,
          },
        },
        {
          arrayFilters: [{ 'elem.row': s.row, 'elem.col': s.col }],
        }
      );
    }

    res.json({ success: true, message: 'Seats unlocked' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Create Booking (strengthened atomicity) ──────────────
exports.createBooking = async (req, res) => {
  try {
    const { showId, seats } = req.body;

    if (!showId || !seats || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one seat to proceed.' });
    }

    if (seats.length > 10) {
      return res.status(400).json({ success: false, message: 'Maximum 10 seats allowed per booking.' });
    }

    // Validate paymentMethod
    const ALLOWED_PAYMENT_METHODS = ['card', 'upi', 'wallet', 'netbanking', 'cinebook_wallet'];
    const paymentMethod = req.body.paymentMethod || 'card';
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method. Must be one of: card, upi, wallet, netbanking' });
    }

    // Validate seat objects
    for (const seat of seats) {
      if (typeof seat.row !== 'number' || typeof seat.col !== 'number' || seat.row < 0 || seat.col < 0) {
        return res.status(400).json({ success: false, message: 'Invalid seat data' });
      }
    }

    const now = new Date();

    // ── Step 1: Atomic seat claim ──────────────────────────
    // Try to mark all seats as booked in ONE atomic operation.
    // Condition: seat must be unbooked AND (not locked OR locked by THIS user OR lock expired)
    // This prevents any race condition — if another user booked between lock and payment, this fails.
    const show = await Show.findById(showId).populate('movie');
    if (!show) return res.status(404).json({ success: false, message: 'Show not found' });

    // Validate each seat before attempting atomic update
    for (const seat of seats) {
      const showSeat = show.seats.find(s => s.row === seat.row && s.col === seat.col);
      if (!showSeat) {
        return res.status(400).json({ success: false, message: `Seat ${String.fromCharCode(65 + seat.row)}${seat.col + 1} does not exist` });
      }
      if (showSeat.userId) {
        return res.status(400).json({ success: false, message: `Seat ${String.fromCharCode(65 + seat.row)}${seat.col + 1} was just booked by another user. Please pick another.` });
      }
      // Check if locked by someone else and lock hasn't expired
      if (
        showSeat.lockedBy &&
        showSeat.lockedBy.toString() !== req.user._id.toString() &&
        showSeat.lockedUntil > now
      ) {
        return res.status(409).json({
          success: false,
          message: `Seat ${String.fromCharCode(65 + seat.row)}${seat.col + 1} is temporarily held by another user. Please select a different seat.`,
        });
      }
    }

    // ── Step 2: Calculate total ────────────────────────────
    let totalAmount = 0;
    const seatDetails = seats.map(seat => {
      const showSeat = show.seats.find(s => s.row === seat.row && s.col === seat.col);
      const price = show.pricing[showSeat.category];
      totalAmount += price;
      return { row: seat.row, col: seat.col, category: showSeat.category, price };
    });
    const convenienceFee = Math.round(totalAmount * 0.02);

    // ── Step 3: Create booking record ─────────────────────
    // If paying with CineBook wallet, verify balance first
    if (paymentMethod === 'cinebook_wallet') {
      const User = require('../models/User');
      const walletUser = await User.findById(req.user._id).select('walletBalance');
      if ((walletUser.walletBalance || 0) < totalAmount + convenienceFee) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient CineBook Wallet balance. Please top up and try again.',
        });
      }
    }

    const booking = await Booking.create({
      user: req.user._id,
      show: showId,
      movie: show.movie._id,
      seats: seatDetails,
      totalAmount: totalAmount + convenienceFee,
      convenienceFee,
      paymentStatus: 'paid',
      paymentMethod,
    });

    // ── Step 4: Atomic seat assignment ────────────────────
    // Mark seats as permanently booked. Condition: userId must still be null
    // (guards against the tiny window between validation and this update)
    let allUpdated = true;
    for (const seat of seats) {
      const updateResult = await Show.updateOne(
        {
          _id: showId,
          seats: {
            $elemMatch: {
              row: seat.row,
              col: seat.col,
              userId: null, // must still be unbooked
            },
          },
        },
        {
          $set: {
            'seats.$[elem].userId': req.user._id,
            'seats.$[elem].bookingId': booking._id,
            'seats.$[elem].lockedBy': null,
            'seats.$[elem].lockedUntil': null,
          },
        },
        {
          arrayFilters: [{ 'elem.row': seat.row, 'elem.col': seat.col }],
        }
      );
      if (updateResult.modifiedCount === 0) {
        allUpdated = false;
        break;
      }
    }

    if (!allUpdated) {
      // Rollback: delete booking and release any seats we already marked
      try {
        await Booking.findByIdAndDelete(booking._id);
        // Release any seats we may have partially updated
        for (const seat of seats) {
          await Show.updateOne(
            { _id: showId, 'seats.row': seat.row, 'seats.col': seat.col, 'seats.bookingId': booking._id },
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
      } catch (rollbackErr) {
        console.error('❌ Booking rollback failed:', rollbackErr.message);
        // Even if rollback fails, return conflict to the user — don't leave them hanging
      }
      return res.status(409).json({
        success: false,
        message: 'One or more seats were just booked by another user. Please refresh and select new seats.',
      });
    }

    // ── Step 5: Update movie booking count ────────────────
    await Movie.findByIdAndUpdate(show.movie._id, { $inc: { totalBookings: seats.length } });

    // ── Step 5b: Deduct from wallet if wallet payment ─────
    if (paymentMethod === 'cinebook_wallet') {
      await deductWallet(
        req.user._id,
        totalAmount + convenienceFee,
        'Booking ' + booking.bookingId + ' — ' + (show.movie.title || 'Movie')
      );
    }

    // ── Step 6: Return populated booking ──────────────────
    const populated = await Booking.findById(booking._id)
      .populate({ path: 'show', populate: { path: 'theater' } })
      .populate('movie')
      .populate('user');

    notifyAdminNewBooking(populated).catch(err => console.warn('Admin notification failed:', err.message));

    res.status(201).json({ success: true, booking: populated });
  } catch (err) {
    console.error('❌ createBooking error:', err.message, '\n', err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate({ path: 'show', populate: { path: 'theater' } })
      .populate('movie')
      .sort({ createdAt: -1 });

    // Filter out bookings where show or movie was deleted
    const validBookings = bookings.filter(b => b.movie && b.show);

    res.json({ success: true, bookings: validBookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: 'show', populate: { path: 'theater' } })
      .populate('movie user');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    // Guard: user may have been deleted
    const bookingUserId = booking.user?._id?.toString() || booking.user?.toString();
    if (bookingUserId !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (!booking.user || booking.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });
    if (booking.status === 'cancelled')
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' });

    // Enforce 10-minute cancellation window
    const CANCEL_WINDOW_MS = 10 * 60 * 1000;
    const bookingAge = Date.now() - new Date(booking.createdAt).getTime();
    if (bookingAge > CANCEL_WINDOW_MS) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation window has expired. Bookings can only be cancelled within 10 minutes of purchase.',
      });
    }

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

    // Free up seats
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

    // Decrement movie booking count
    await Movie.findByIdAndUpdate(booking.movie, { $inc: { totalBookings: -booking.seats.length } })
      .catch(err => console.warn('Failed to decrement totalBookings:', err.message));

    // Refund to CineBook Wallet (regardless of original payment method)
    try {
      await refundWallet(
        req.user._id,
        booking.totalAmount,
        'Refund for cancelled booking ' + booking.bookingId
      );
    } catch (walletErr) {
      console.warn('Wallet refund failed:', walletErr.message);
    }

    res.json({ success: true, message: 'Booking cancelled. ₹' + booking.totalAmount + ' refunded to your CineBook Wallet.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Verify Booking (public — for QR scan) ────────────────
exports.verifyBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
      .populate({ path: 'show', populate: { path: 'theater' } })
      .populate('movie user');

    if (!booking) {
      return res.status(404).json({ success: false, valid: false, message: 'Booking not found' });
    }

    res.json({
      success: true,
      valid: booking.status === 'confirmed',
      booking: {
        bookingId: booking.bookingId,
        status: booking.status,
        movie: booking.movie?.title,
        theater: booking.show?.theater?.name,
        date: booking.show?.date,
        time: booking.show?.time,
        seats: booking.seats.map(s => `${String.fromCharCode(65 + s.row)}${s.col + 1}`),
        totalAmount: booking.totalAmount,
        userName: booking.user?.name,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, valid: false, message: err.message });
  }
};
