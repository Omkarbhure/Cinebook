const Show = require('../models/Show');
const Theater = require('../models/Theater');
const mongoose = require('mongoose');
const { refreshShows } = require('../services/showScheduler');

exports.getShowsByMovie = async (req, res) => {
  try {
    const { date, city } = req.query;
    const filter = { movie: req.params.movieId, isActive: true };

    if (date) {
      // Use UTC dates to match how MongoDB stores them
      const start = new Date(date + 'T00:00:00.000Z');
      const end   = new Date(date + 'T23:59:59.999Z');
      filter.date = { $gte: start, $lte: end };
    }

    let shows = await Show.find(filter).populate('theater').sort({ time: 1 });
    shows = shows.filter(s => s.theater && s.theater.city);
    if (city) shows = shows.filter(s => s.theater.city.toLowerCase() === city.toLowerCase());

    // If no shows found for a current/future date, trigger a non-blocking refresh
    if (shows.length === 0 && date) {
      const [y, m, d] = date.split('-').map(Number);
      const queryDate = new Date(y, m - 1, d);
      const today = new Date(); today.setHours(0, 0, 0, 0);

      if (queryDate >= today) {
        // Fire refresh without awaiting — user gets empty response now,
        // next request will have shows
        refreshShows().catch(() => {});
      }
    }

    res.json({ success: true, shows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getShowById = async (req, res) => {
  try {
    const show = await Show.findById(req.params.id).populate('movie theater');
    if (!show) return res.status(404).json({ success: false, message: 'Show not found' });
    res.json({ success: true, show });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createShow = async (req, res) => {
  try {
    const theater = await Theater.findById(req.body.theater);
    if (!theater) return res.status(404).json({ success: false, message: 'Theater not found' });

    // Auto-generate seat layout
    const seats = [];
    for (let r = 0; r < theater.rows; r++) {
      for (let c = 0; c < theater.cols; c++) {
        let category = 'silver';
        if (r >= theater.rows - 4) category = 'platinum';
        else if (r >= theater.rows - 8) category = 'gold';
        seats.push({ row: r, col: c, category });
      }
    }

    const show = await Show.create({ ...req.body, seats });
    res.status(201).json({ success: true, show });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteShow = async (req, res) => {
  try {
    await Show.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Show deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getShowsByTheater = async (req, res) => {
  try {
    const { theaterId } = req.params;
    const { date } = req.query;
    const filter = { theater: theaterId, isActive: true };

    if (date) {
      filter.date = {
        $gte: new Date(date + 'T00:00:00.000Z'),
        $lte: new Date(date + 'T23:59:59.999Z'),
      };
    } else {
      const today = new Date().toISOString().split('T')[0];
      filter.date = {
        $gte: new Date(today + 'T00:00:00.000Z'),
        $lte: new Date(today + 'T23:59:59.999Z'),
      };
    }

    const shows = await Show.find(filter).populate('movie').sort({ time: 1 });
    res.json({ success: true, shows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
