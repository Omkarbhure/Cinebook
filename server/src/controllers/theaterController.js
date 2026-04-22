const Theater = require('../models/Theater');
const Show = require('../models/Show');
const Movie = require('../models/Movie');
const placesService = require('../services/placesService');

exports.getNearbyTheaters = async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    const theaters = await Theater.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          maxDistance: parseFloat(radius) * 1000,
          spherical: true
        }
      }
    ]);

    const theatersWithMovies = await Promise.all(theaters.map(async (theater) => {
      const movieIds = await Show.find({ theater: theater._id }).distinct('movie');
      return {
        ...theater,
        distance: (theater.distance / 1000).toFixed(2),
        availableMoviesCount: movieIds.length
      };
    }));

    res.json({ success: true, count: theatersWithMovies.length, data: theatersWithMovies });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getTheatersByCity = async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).json({ success: false, message: 'City is required' });

    // 1. Fetch REAL cinemas from External API (Google Places)
    const realCinemas = await placesService.fetchRealCinemas(city);

    // 2. Sync with our DB ("Shadow Caching")
    const theaters = await Promise.all(realCinemas.map(async (rc) => {
      let theater = await Theater.findOne({ placeId: rc.placeId });

      if (!theater) {
        // Create a new shadow theater for this real-world location
        theater = await Theater.create({
          name: rc.name,
          address: rc.address,
          city: city,
          rows: 10,
          cols: 12,
          facilities: ["Recliner", "Dolby Atmos", "Cafe"],
          rating: rc.rating,
          placeId: rc.placeId,
          location: {
            type: 'Point',
            coordinates: [rc.location.lng, rc.location.lat]
          }
        });

        // 3. Simulate INITIAL Shows for this new theater
        // We'll assign some random "now_playing" movies
        const movies = await Movie.find({ status: 'now_playing' }).limit(3);
        const times = ["11:00 AM", "02:30 PM", "06:00 PM", "09:30 PM"];
        
        for (const movie of movies) {
          for (const time of times) {
            // Generate seats array
            const seats = [];
            for (let r = 0; r < 10; r++) {
              for (let c = 0; c < 12; c++) {
                seats.push({ row: r, col: c, category: r > 7 ? 'platinum' : r > 4 ? 'gold' : 'silver' });
              }
            }
            await Show.create({
              movie: movie._id,
              theater: theater._id,
              date: new Date(),
              time,
              seats,
              pricing: { silver: 180, gold: 280, platinum: 450 }
            });
          }
        }
      }

      const movieIds = await Show.find({ theater: theater._id }).distinct('movie');
      return {
        ...theater._doc,
        availableMoviesCount: movieIds.length
      };
    }));

    res.json({
      success: true,
      data: theaters
    });
  } catch (err) {
    console.error('getTheatersByCity Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTheaterById = async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id);
    if (!theater) return res.status(404).json({ success: false, message: 'Theater not found' });
    res.json({ success: true, data: theater });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
