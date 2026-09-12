/**
 * verify_shows.js — post-refresh verification
 * Checks: every now_playing movie has shows in Nanded and other cities today.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Show    = require('./src/models/Show');
const Movie   = require('./src/models/Movie');
const Theater = require('./src/models/Theater');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setUTCDate(today.getUTCDate() + 1);

  const movies   = await Movie.find({ status: 'now_playing' }).select('_id title');
  const theaters = await Theater.find({}).select('_id city');

  // Group theaters by city
  const theatersByCity = {};
  for (const t of theaters) {
    if (!theatersByCity[t.city]) theatersByCity[t.city] = [];
    theatersByCity[t.city].push(t._id.toString());
  }

  const testCities = ['Nanded', 'Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad'];

  console.log(`\n=== Show verification (${today.toISOString().split('T')[0]}) ===\n`);
  console.log(`Total now_playing movies : ${movies.length}`);
  console.log(`Total theaters           : ${theaters.length}`);
  console.log(`Cities checked           : ${testCities.join(', ')}\n`);

  let moviesWithZeroNanded = 0;
  const cityMissing = {}; // city → count of movies missing

  for (const city of testCities) {
    const cityTheaterIds = theatersByCity[city] || [];
    let missing = 0;
    const missingMovies = [];

    for (const movie of movies) {
      const count = await Show.countDocuments({
        movie:   movie._id,
        theater: { $in: cityTheaterIds },
        date:    { $gte: today, $lt: tomorrow },
      });
      if (count === 0) {
        missing++;
        missingMovies.push(movie.title);
      }
    }

    const status = missing === 0 ? '✅' : '❌';
    console.log(`${status} ${city.padEnd(20)} — ${movies.length - missing}/${movies.length} movies have shows today`);
    if (missing > 0) {
      console.log(`   Missing: ${missingMovies.slice(0, 5).join(', ')}${missing > 5 ? ` +${missing - 5} more` : ''}`);
      cityMissing[city] = missing;
    }
    if (city === 'Nanded') moviesWithZeroNanded = missing;
  }

  // Total show counts
  const totalFuture = await Show.countDocuments({ date: { $gte: today } });
  const totalToday  = await Show.countDocuments({ date: { $gte: today, $lt: tomorrow } });

  console.log(`\nTotal shows (today)   : ${totalToday}`);
  console.log(`Total shows (future)  : ${totalFuture}`);

  // Shows per movie in Nanded
  const nandedIds = (theatersByCity['Nanded'] || []);
  const sampleMovie = movies[0];
  const sampleShows = await Show.find({
    movie:   sampleMovie._id,
    theater: { $in: nandedIds },
    date:    { $gte: today, $lt: tomorrow },
  }).populate('theater', 'name').sort({ time: 1 });

  console.log(`\nSample — "${sampleMovie.title}" shows in Nanded today:`);
  if (sampleShows.length === 0) {
    console.log('  NONE ❌');
  } else {
    sampleShows.forEach(s => console.log(`  ${s.time} @ ${s.theater.name} [${s.format}]`));
  }

  const allGood = Object.keys(cityMissing).length === 0;
  console.log(allGood ? '\n✅ All movies have shows in all tested cities!' : '\n⚠️  Some movies still missing shows — see above.');

  await mongoose.disconnect();
  process.exit(allGood ? 0 : 1);
}).catch(e => { console.error(e.message); process.exit(1); });
