require('dotenv').config();
const mongoose = require('mongoose');
require('./src/models/Movie');
require('./src/models/Theater');
const Show = require('./src/models/Show');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cinebook').then(async () => {
  // Find shows at same theater, same date, same time
  const dups = await Show.aggregate([
    { $group: { _id: { theater: '$theater', date: '$date', time: '$time' }, count: { $sum: 1 }, movies: { $push: '$movie' } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 }
  ]);
  console.log('Duplicate time slots (same theater+date+time):', dups.length);
  if (dups.length > 0) console.log(JSON.stringify(dups.slice(0,3), null, 2));

  // Also show a sample of today's shows for one theater
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sample = await Show.find({ date: { $gte: today, $lt: tomorrow } })
    .populate('movie', 'title')
    .populate('theater', 'name')
    .select('movie theater time format')
    .limit(20);

  console.log('\nToday\'s shows sample:');
  sample.forEach(s => console.log(`  [${s.theater?.name}] ${s.time} | ${s.format} | ${s.movie?.title}`));

  mongoose.disconnect();
});
