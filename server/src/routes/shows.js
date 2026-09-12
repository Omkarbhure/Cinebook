const express = require('express');
const router = express.Router();
const { getShowById, createShow, deleteShow, getShowsByTheater } = require('../controllers/showController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/:id', getShowById);
router.get('/theater/:theaterId', getShowsByTheater);
router.post('/', protect, adminOnly, createShow);
router.delete('/:id', protect, adminOnly, deleteShow);

module.exports = router;
