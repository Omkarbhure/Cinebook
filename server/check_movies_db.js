require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Movie = require('./src/models/Movie');

  // Count by status
  const counts = await Movie.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  console.log('\n📊 Movie counts by status:');
  counts.forEach(c => console.log(`   ${c._id}: ${c.count}`));

  const total = await Movie.countDocuments();
  console.log(`   TOTAL: ${total}`);

  // Check for broken posters (null/empty/placeholder)
  const brokenPosters = await Movie.countDocuments({
    $or: [
      { poster: null }, { poster: '' },
      { poster: { $regex: 'placeholder', $options: 'i' } },
      { poster: { $regex: 'via.placeholder', $options: 'i' } },
    ]
  });
  console.log(`\n🖼️  Broken/placeholder posters: ${brokenPosters}`);

  // Check for missing required fields
  const missingTitle = await Movie.countDocuments({ $or: [{ title: null }, { title: '' }] });
  const missingDesc  = await Movie.countDocuments({ $or: [{ description: null }, { description: '' }] });
  const missingDur   = await Movie.countDocuments({ $or: [{ duration: null }, { duration: 0 }] });
  console.log(`\n⚠️  Missing fields:`);
  console.log(`   Missing title: ${missingTitle}`);
  console.log(`   Missing description: ${missingDesc}`);
  console.log(`   Missing duration: ${missingDur}`);

  // Check indexes
  const indexes = await Movie.collection.indexes();
  console.log(`\n🔍 Indexes on movies collection:`);
  indexes.forEach(idx => console.log(`   ${JSON.stringify(idx.key)} — ${idx.name}`));

  // Measure query time
  console.log('\n⏱️  Query performance:');
  let t = Date.now();
  await Movie.find({ status: 'now_playing' }).limit(50);
  console.log(`   find(now_playing, limit=50): ${Date.now() - t}ms`);

  t = Date.now();
  await Movie.find({ genre: { $in: ['Action'] } }).limit(50);
  console.log(`   find(genre=Action, limit=50): ${Date.now() - t}ms`);

  t = Date.now();
  await Movie.find({ title: { $regex: 'Godzilla', $options: 'i' } });
  console.log(`   find(search=Godzilla): ${Date.now() - t}ms`);

  // Sample of movies
  const sample = await Movie.find({ status: 'now_playing' })
    .select('title status poster rating')
    .sort({ releaseDate: -1 })
    .limit(10);
  console.log('\n🎬 Latest 10 now_playing movies:');
  sample.forEach(m => {
    const posterOk = m.poster && !m.poster.includes('placeholder');
    console.log(`   ${posterOk ? '✅' : '❌'} ${m.title} (⭐${m.rating})`);
  });

  mongoose.disconnect();
});
