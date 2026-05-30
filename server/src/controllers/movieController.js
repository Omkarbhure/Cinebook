const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Show = require('../models/Show');
const mongoose = require('mongoose');

exports.getAllMovies = async (req, res) => {
  try {
    const { status, genre, languages, search, city, sortBy } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const page  = Math.max(parseInt(req.query.page) || 1, 1);

    const filter = {};
    if (status) filter.status = status;
    if (genre) filter.genre = { $in: [genre] };
    if (languages) filter.languages = { $in: [languages] };
    if (search) {
      // Use regex search as fallback — works even without text index
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { releaseDate: -1 };
    if (sortBy === 'rating') sortOption = { rating: -1 };
    if (sortBy === 'title') sortOption = { title: 1 };
    if (sortBy === 'oldest') sortOption = { releaseDate: 1 };

    // City filter: intersect with existing _id filter if present
    if (city) {
      const theaters = await Theater.find({ city }).select('_id');
      const theaterIds = theaters.map(t => t._id);
      const movieIdsWithShows = await Show.find({ theater: { $in: theaterIds } }).distinct('movie');

      if (filter._id) {
        // Intersect: keep only IDs that satisfy both constraints
        const existingIds = filter._id.$in.map(id => id.toString());
        const cityIds = movieIdsWithShows.map(id => id.toString());
        const intersection = existingIds.filter(id => cityIds.includes(id));
        filter._id = { $in: intersection };
      } else {
        filter._id = { $in: movieIdsWithShows };
      }
    }

    const movies = await Movie.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Movie.countDocuments(filter);

    res.json({ success: true, movies, total, pages: Math.ceil(total / limit) });
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
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
    await Show.deleteMany({ movie: req.params.id });
    res.json({ success: true, message: 'Movie and associated shows deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
