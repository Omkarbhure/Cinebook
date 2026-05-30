/**
 * Fix broken Amazon CDN posters — replace with TMDB posters
 * Searches TMDB by movie title and updates the poster URL
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Movie = require('./src/models/Movie');

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

if (!TMDB_KEY) {
  console.error('❌ TMDB_API_KEY not found in .env');
  process.exit(1);
}

const searchTMDB = async (title) => {
  try {
    const res = await axios.get(`${TMDB_BASE}/search/movie`, {
      params: { api_key: TMDB_KEY, query: title, language: 'en-US' },
      timeout: 8000,
    });
    const results = res.data.results || [];
    const match = results.find(r => r.poster_path);
    return match ? `${POSTER_BASE}${match.poster_path}` : null;
  } catch {
    return null;
  }
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // Find all movies with broken Amazon CDN or placeholder posters
  const broken = await Movie.find({
    $or: [
      { poster: /media-amazon/ },
      { poster: /placeholder/ },
      { poster: /k_p_4/ },
    ]
  }).select('_id title poster');

  console.log(`🔍 Found ${broken.length} movies with broken posters\n`);

  let fixed = 0, failed = 0;

  for (let i = 0; i < broken.length; i++) {
    const movie = broken[i];
    process.stdout.write(`\r[${i + 1}/${broken.length}] Fixing: ${movie.title.substring(0, 40).padEnd(40)}`);

    const newPoster = await searchTMDB(movie.title);

    if (newPoster) {
      await Movie.updateOne({ _id: movie._id }, { $set: { poster: newPoster } });
      fixed++;
    } else {
      failed++;
    }

    // Small delay to respect TMDB rate limits
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\n\n✅ Done!`);
  console.log(`   Fixed  : ${fixed}`);
  console.log(`   Failed : ${failed} (no TMDB match found)`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
