const express = require('express');
const router = express.Router();
const {
  getDashboard, getAllUsers, getUserBookings,
  getAllBookings, adminCancelBooking,
  createTheater, getAllTheaters, getTheaterShows, getShowSeatMap,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard', getDashboard);

// Users
router.get('/users', getAllUsers);
router.get('/users/:userId/bookings', getUserBookings);

// Bookings
router.get('/bookings', getAllBookings);
router.put('/bookings/:id/cancel', adminCancelBooking);

// Theaters
router.post('/theaters', createTheater);
router.get('/theaters', getAllTheaters);
router.get('/theaters/:theaterId/shows', getTheaterShows);
router.get('/shows/:showId/seatmap', getShowSeatMap);

module.exports = router;
