require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Movie = require('./src/models/Movie');
  const statuses = await Movie.distinct('status');
  console.log('Statuses in DB:', statuses);
  const counts = await Movie.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  console.log('Counts:', JSON.stringify(counts));
  // Also check if city filter is breaking things
  const total = await Movie.countDocuments({});
  console.log('Total movies:', total);
  mongoose.disconnect();
});
