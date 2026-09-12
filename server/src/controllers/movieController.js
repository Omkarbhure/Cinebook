const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Show = require('../models/Show');
const mongoose = require('mongoose');

// In-memory cache for ultra-fast movie responses (<1ms)
const movieCache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes TTL

const invalidateMovieCache = () => {
  movieCache.clear();
};

exports.invalidateMovieCache = invalidateMovieCache;

exports.getAllMovies = async (req, res) => {
  try {
    const { status, genre, languages, search, city, sortBy } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const page  = Math.max(parseInt(req.query.page) || 1, 1);

    // Cache key based on query parameters (don't cache arbitrary searches)
    const cacheKey = !search ? `movies_${status || ''}_${genre || ''}_${languages || ''}_${city || ''}_${sortBy || ''}_${page}_${limit}` : null;
    
    if (cacheKey && movieCache.has(cacheKey)) {
      const cached = movieCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.json(cached.data);
      }
      movieCache.delete(cacheKey);
    }

    const filter = {};
    if (status) filter.status = status;
    if (genre) filter.genre = { $in: [genre] };
    if (languages) filter.languages = { $in: [languages] };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { releaseDate: -1 };
    if (sortBy === 'rating') sortOption = { rating: -1 };
    if (sortBy === 'title') sortOption = { title: 1 };
    if (sortBy === 'oldest') sortOption = { releaseDate: 1 };

    // City filter: optimize with parallel or cached theater lookups
    if (city) {
      const theaters = await Theater.find({ city }).select('_id').lean();
      const theaterIds = theaters.map(t => t._id);
      const movieIdsWithShows = await Show.find({ theater: { $in: theaterIds } }).distinct('movie');

      if (movieIdsWithShows.length > 0) {
        if (filter._id) {
          const existingIds = filter._id.$in.map(id => id.toString());
          const cityIds = movieIdsWithShows.map(id => id.toString());
          const intersection = existingIds.filter(id => cityIds.includes(id));
          filter._id = { $in: intersection };
        } else {
          filter._id = { $in: movieIdsWithShows };
        }
      }
    }

    // Run find and count in parallel using .lean() for maximum throughput
    let [movies, total] = await Promise.all([
      Movie.find(filter)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Movie.countDocuments(filter),
    ]);

    // Fallback: If city-filtered query returned 0 movies, return all movies matching the status/genre
    if (movies.length === 0 && city) {
      delete filter._id;
      [movies, total] = await Promise.all([
        Movie.find(filter)
          .sort(sortOption)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Movie.countDocuments(filter),
      ]);
    }

    // Safety deduplication by lowercase title to prevent any duplicate movie cards
    const seenTitles = new Set();
    const uniqueMovies = [];
    for (const m of movies) {
      const normTitle = (m.title || '').trim().toLowerCase();
      if (!seenTitles.has(normTitle)) {
        seenTitles.add(normTitle);
        uniqueMovies.push(m);
      }
    }

    const responseData = { success: true, movies: uniqueMovies, total: uniqueMovies.length, pages: Math.ceil(uniqueMovies.length / limit) };

    if (cacheKey) {
      movieCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    }

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMovieById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid movie ID' });
    }
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
    res.json({ success: true, movie });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMovie = async (req, res) => {
  try {
    const { title, description, duration, poster, releaseDate } = req.body;
    if (!title || !description || !duration || !poster || !releaseDate) {
      return res.status(400).json({ success: false, message: 'title, description, duration, poster and releaseDate are required' });
    }
    const movie = await Movie.create(req.body);
    invalidateMovieCache();
    res.status(201).json({ success: true, movie });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMovie = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid movie ID' });
    }
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
    invalidateMovieCache();
    res.json({ success: true, movie });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMovie = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid movie ID' });
    }

    const Booking = require('../models/Booking');
    const activeBookingCount = await Booking.countDocuments({
      movie: req.params.id,
      status: { $nin: ['cancelled'] },
    });
    if (activeBookingCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete: ${activeBookingCount} active booking(s) exist for this movie. Cancel or refund them first.`,
      });
    }

    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
    await Show.deleteMany({ movie: req.params.id });
    invalidateMovieCache();
    res.json({ success: true, message: 'Movie and associated shows deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
