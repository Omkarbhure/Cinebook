const Show = require('../models/Show');
const Theater = require('../models/Theater');

exports.getShowsByMovie = async (req, res) => {
  try {
    const { date, city } = req.query;
    const filter = { movie: req.params.movieId, isActive: true };
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    let shows = await Show.find(filter).populate('theater').sort({ time: 1 });
    if (city) shows = shows.filter(s => s.theater.city.toLowerCase() === city.toLowerCase());

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
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const shows = await Show.find(filter).populate('movie').sort({ time: 1 });
    res.json({ success: true, shows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
