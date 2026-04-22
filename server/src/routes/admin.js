const express = require('express');
const router = express.Router();
const { getDashboard, getAllUsers, getAllBookings, createTheater, getAllTheaters } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect, adminOnly); // All admin routes protected
router.get('/dashboard', getDashboard);
router.get('/users', getAllUsers);
router.get('/bookings', getAllBookings);
router.post('/theaters', createTheater);
router.get('/theaters', getAllTheaters);

module.exports = router;
