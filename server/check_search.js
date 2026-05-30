require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Movie = require('./src/models/Movie');
  const all = await Movie.find({}).select('title status').limit(20);
  console.log('All movies:', all.map(m => `${m.title} (${m.status})`));
  const search = await Movie.find({ title: { $regex: 'Godzilla', $options: 'i' } });
  console.log('Godzilla search:', search.map(m => m.title));
  mongoose.disconnect();
});
