const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Show = require('../models/Show');

exports.getAllMovies = async (req, res) => {
  try {
    const { status, genre, languages, search, city, sortBy, page = 1, limit = 12 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (genre) filter.genre = { $in: [genre] };
    if (languages) filter.languages = { $in: [languages] };
    if (search) filter.$text = { $search: search };

    // Sorting Logic
    let sortOption = { releaseDate: -1 }; // Default: Newest
    if (sortBy === 'rating') sortOption = { rating: -1 };
    if (sortBy === 'title') sortOption = { title: 1 };
    if (sortBy === 'oldest') sortOption = { releaseDate: 1 };

    // City Filter: Only show movies available in the selected city
    if (city) {
      const theaters = await Theater.find({ city }).select('_id');
      const theaterIds = theaters.map(t => t._id);
      const movieIdsWithShows = await Show.find({ theater: { $in: theaterIds } }).distinct('movie');
      filter._id = { $in: movieIdsWithShows };
    }

    const movies = await Movie.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Movie.countDocuments(filter);

    res.json({ success: true, movies, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
    res.json({ success: true, movie });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMovie = async (req, res) => {
  try {
    const movie = await Movie.create(req.body);
    res.status(201).json({ success: true, movie });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
    res.json({ success: true, movie });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
    res.json({ success: true, message: 'Movie deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
