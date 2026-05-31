const mongoose = require('mongoose');
const Theater = require('../models/Theater');
const Show = require('../models/Show');
const Movie = require('../models/Movie');
const placesService = require('../services/placesService');

const THEATER_TEMPLATES = [
  { prefix: 'PVR',   suffix: 'Cinemas',   facilities: ['Dolby Atmos', 'Recliner', 'Cafe'] },
  { prefix: 'INOX',  suffix: 'Multiplex', facilities: ['4K Laser', 'Recliner', 'Bar'] },
  { prefix: 'Miraj', suffix: 'Cinemas',   facilities: ['Dolby', 'Snack Bar'] },
];

const SHOW_TIMES   = ['10:00 AM', '01:00 PM', '04:00 PM', '07:00 PM', '10:00 PM'];
const SHOW_FORMATS = ['2D', '3D', 'IMAX', '2D', '3D'];

const generateSeats = (rows = 10, cols = 12) => {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let category = 'silver';
      if (r >= rows - 2) category = 'platinum';
      else if (r >= rows - 5) category = 'gold';
      seats.push({ row: r, col: c, category, userId: null, bookingId: null, lockedBy: null, lockedUntil: null });
    }
  }
  return seats;
};

const getNext7Days = () => Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0); // LOCAL midnight — matches scheduler
  d.setDate(d.getDate() + i);
  return new Date(d);
});

// ─── Ensure city has theaters + shows (auto-provision) ────────────────────────
exports.ensureCity = async (req, res) => {
  try {
    const { city } = req.body;
    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ success: false, message: 'City is required' });
    }

    const cityName = city.trim();

    // Validate city name — letters, spaces, hyphens only
    if (!/^[a-zA-Z\s\-]+$/.test(cityName)) {
      return res.status(400).json({ success: false, message: 'Invalid city name' });
    }

    // Check if city already has theaters
    const existing = await Theater.find({ city: new RegExp('^' + cityName + '$', 'i') });
    if (existing.length > 0) {
      return res.json({ success: true, message: 'City already provisioned', theaters: existing.length });
    }

    const movies = await Movie.find({});
    if (movies.length === 0) {
      return res.status(400).json({ success: false, message: 'No movies available to schedule' });
    }

    const days = getNext7Days();
    const createdTheaters = [];

    for (let t = 0; t < THEATER_TEMPLATES.length; t++) {
      const tmpl = THEATER_TEMPLATES[t];
      const theater = await Theater.create({
        name: tmpl.prefix + ' ' + cityName + ' ' + tmpl.suffix,
        address: tmpl.prefix + ' Mall, ' + cityName,
        city: cityName,
        rows: 10, cols: 12,
        facilities: tmpl.facilities,
        rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        location: { type: 'Point', coordinates: [0, 0] },
      });

      for (const day of days) {
        for (let slot = 0; slot < Math.min(movies.length, 5); slot++) {
          const movie = movies[slot];
          const timeIndex = (slot + t) % SHOW_TIMES.length;
          await Show.create({
            movie:    movie._id,
            theater:  theater._id,
            date:     new Date(day),
            time:     SHOW_TIMES[timeIndex],
            language: movie.languages?.[0] || 'English',
            format:   SHOW_FORMATS[timeIndex],
            pricing:  { silver: 150, gold: 250, platinum: 400 },
            seats:    generateSeats(),
            isActive: true,
          });
        }
      }
      createdTheaters.push(theater);
    }

    res.json({
      success: true,
      message: 'Provisioned ' + createdTheaters.length + ' theaters in ' + cityName,
      theaters: createdTheaters.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Nearby theaters ──────────────────────────────────────
exports.getNearbyTheaters = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 5;

    if (!req.query.lat || !req.query.lng) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates — lat and lng must be numbers' });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Coordinates out of range' });
    }

    const theaters = await Theater.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          maxDistance: radius * 1000,
          spherical: true,
        },
      },
    ]);

    const theatersWithMovies = await Promise.all(theaters.map(async (theater) => {
      const movieIds = await Show.find({ theater: theater._id }).distinct('movie');
      return { ...theater, distance: (theater.distance / 1000).toFixed(2), availableMoviesCount: movieIds.length };
    }));

    res.json({ success: true, count: theatersWithMovies.length, data: theatersWithMovies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Theaters by city ─────────────────────────────────────
exports.getTheatersByCity = async (req, res) => {
  try {
    const { city } = req.query;
    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, message: 'City is required' });
    }

    const realCinemas = await placesService.fetchRealCinemas(city);

    const theaters = await Promise.all(realCinemas.map(async (rc) => {
      let theater = await Theater.findOne({ placeId: rc.placeId });

      if (!theater) {
        theater = await Theater.create({
          name: rc.name,
          address: rc.address,
          city: city.trim(),
          rows: 10, cols: 12,
          facilities: ['Recliner', 'Dolby Atmos', 'Cafe'],
          rating: rc.rating,
          placeId: rc.placeId,
          location: { type: 'Point', coordinates: [rc.location.lng, rc.location.lat] },
        });

        const movies = await Movie.find({}).limit(3);
        const times = ['11:00 AM', '02:30 PM', '06:00 PM', '09:30 PM'];
        const days = getNext7Days();
        for (const movie of movies) {
          for (let di = 0; di < days.length; di++) {
            for (let ti = 0; ti < times.length; ti++) {
              await Show.create({
                movie: movie._id, theater: theater._id,
                date: days[di], time: times[ti], seats: generateSeats(),
                language: movie.languages?.[0] || 'English',
                format: ['2D', '3D', 'IMAX', '2D'][ti % 4],
                pricing: { silver: 180, gold: 280, platinum: 450 },
                isActive: true,
              });
            }
          }
        }
      }

      const movieIds = await Show.find({ theater: theater._id }).distinct('movie');
      return { ...theater._doc, availableMoviesCount: movieIds.length };
    }));

    res.json({ success: true, data: theaters });
  } catch (err) {
    console.error('getTheatersByCity Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Theater by ID ────────────────────────────────────────
exports.getTheaterById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid theater ID' });
    }
    const theater = await Theater.findById(req.params.id);
    if (!theater) return res.status(404).json({ success: false, message: 'Theater not found' });
    res.json({ success: true, data: theater });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
