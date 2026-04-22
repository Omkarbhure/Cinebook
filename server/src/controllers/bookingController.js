const Booking = require('../models/Booking');
const Show = require('../models/Show');
const Movie = require('../models/Movie');

exports.createBooking = async (req, res) => {
  try {
    const { showId, seats } = req.body;

    if (!showId || !seats || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one seat to proceed.' });
    }

    const show = await Show.findById(showId).populate('movie');
    if (!show) return res.status(404).json({ success: false, message: 'Show not found' });

    // Check seat availability
    for (const seat of seats) {
      const showSeat = show.seats.find(s => s.row === seat.row && s.col === seat.col);
      if (!showSeat) return res.status(400).json({ success: false, message: `Seat [Row ${seat.row}, Col ${seat.col}] does not exist in this theater.` });
      if (showSeat.userId) return res.status(400).json({ success: false, message: `Seat [Row ${seat.row}, Col ${seat.col}] was just booked. Please pick another.` });
    }

    // Calculate total
    let totalAmount = 0;
    const seatDetails = seats.map(seat => {
      const showSeat = show.seats.find(s => s.row === seat.row && s.col === seat.col);
      const price = show.pricing[showSeat.category];
      totalAmount += price;
      return { row: seat.row, col: seat.col, category: showSeat.category, price };
    });
    const convenienceFee = Math.round(totalAmount * 0.02);

    // Create booking
    const booking = await Booking.create({
      user: req.user._id,
      show: showId,
      movie: show.movie._id,
      seats: seatDetails,
      totalAmount: totalAmount + convenienceFee,
      convenienceFee,
      paymentStatus: 'paid', // mock payment
      paymentMethod: req.body.paymentMethod || 'card',
    });

    // Atomic update to mark seats as booked
    // We verify each specific seat is still unassigned ($elemMatch with userId: null)
    const updateResult = await Show.updateOne(
      { 
        _id: showId, 
        seats: { 
          $all: seats.map(s => ({
            $elemMatch: { row: s.row, col: s.col, userId: null }
          }))
        } 
      },
      { 
        $set: { 
          "seats.$[elem].userId": req.user._id,
          "seats.$[elem].bookingId": booking._id
        } 
      },
      { 
        arrayFilters: [
          { 
            $or: seats.map(s => ({ 
              "elem.row": s.row, 
              "elem.col": s.col 
            })) 
          }
        ]
      }
    );

    if (updateResult.modifiedCount === 0) {
      // Rollback booking if seat update failed (someone beat you to it)
      await Booking.findByIdAndDelete(booking._id);
      return res.status(400).json({ success: false, message: 'Unfortunately, one or more seats were just booked by another user. Please select new seats.' });
    }

    // Update total bookings on movie
    await Movie.findByIdAndUpdate(show.movie._id, { $inc: { totalBookings: seats.length } });

    const populated = await booking.populate(['show', 'movie']);
    res.status(201).json({ success: true, booking: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate({ path: 'show', populate: { path: 'theater' } })
      .populate('movie')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
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
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')
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
    if (booking.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

    // Free up seats
    const show = await Show.findById(booking.show);
    if (show) {
      booking.seats.forEach(seat => {
        const showSeat = show.seats.find(s => s.row === seat.row && s.col === seat.col);
        if (showSeat) { showSeat.userId = null; showSeat.bookingId = null; }
      });
      await show.save();
    }

    res.json({ success: true, message: 'Booking cancelled and refund initiated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
