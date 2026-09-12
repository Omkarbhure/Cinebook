const express = require('express');
const router = express.Router();
const { getNearbyTheaters, getTheatersByCity, getTheaterById, ensureCity } = require('../controllers/theaterController');

router.post('/ensure-city', ensureCity);
router.get('/nearby', getNearbyTheaters);
router.get('/details/:id', getTheaterById);
router.get('/', getTheatersByCity);

module.exports = router;
