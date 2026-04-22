const express = require('express');
const router = express.Router();
const { getNearbyTheaters, getTheatersByCity, getTheaterById } = require('../controllers/theaterController');

router.get('/nearby', getNearbyTheaters);
router.get('/details/:id', getTheaterById);
router.get('/', getTheatersByCity);

module.exports = router;
