require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('./src/models/Movie');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const total = await Movie.countDocuments();

  const genres = await Movie.aggregate([
    { $unwind: '$genre' },
    { $group: { _id: '$genre', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const langs = await Movie.aggregate([
    { $unwind: '$languages' },
    { $group: { _id: '$languages', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const statuses = await Movie.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  console.log('TOTAL MOVIES:', total);
  console.log('\nGENRES:');
  genres.forEach(g => console.log('  ', g._id, '-', g.count));
  console.log('\nLANGUAGES:');
  langs.forEach(l => console.log('  ', l._id, '-', l.count));
  console.log('\nSTATUS:');
  statuses.forEach(s => console.log('  ', s._id, '-', s.count));

  process.exit();
});
