/**
 * CineBook — TMDB Movie Seeder (Multi-Language, All Genres)
 * Fetches movies across all languages and genres from TMDB
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Movie = require('./src/models/Movie');

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BANNER_BASE = 'https://image.tmdb.org/t/p/w1280';

if (!TMDB_KEY) {
  console.error('\n❌  TMDB_API_KEY not found in .env\n');
  process.exit(1);
}

const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller',
  10752: 'War', 37: 'Western',
};

const LANG_MAP = {
  en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu',
  fr: 'French', es: 'Spanish', de: 'German', ja: 'Japanese',
  ko: 'Korean', it: 'Italian', pt: 'Portuguese', zh: 'Chinese',
  ru: 'Russian', ml: 'Malayalam', kn: 'Kannada', bn: 'Bengali',
  mr: 'Marathi', pa: 'Punjabi', ar: 'Arabic', tr: 'Turkish',
};

// Extra dubbed languages for Indian films
const INDIAN_LANGS = ['Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi'];

const getStatus = (releaseDateStr) => {
  if (!releaseDateStr) return 'upcoming';
  const release = new Date(releaseDateStr);
  const now = new Date();
  const diffDays = (now - release) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'upcoming';
  return 'now_playing';
};

const fetchPage = async (endpoint, page, extraParams = {}) => {
  try {
    const res = await axios.get(`${TMDB_BASE}${endpoint}`, {
      params: { api_key: TMDB_KEY, page, language: 'en-US', ...extraParams },
      timeout: 10000,
    });
    return res.data.results || [];
  } catch {
    return [];
  }
};

const fetchDetails = async (tmdbId) => {
  try {
    const [detailRes, creditsRes, videosRes] = await Promise.all([
      axios.get(`${TMDB_BASE}/movie/${tmdbId}`, { params: { api_key: TMDB_KEY }, timeout: 8000 }),
      axios.get(`${TMDB_BASE}/movie/${tmdbId}/credits`, { params: { api_key: TMDB_KEY }, timeout: 8000 }),
      axios.get(`${TMDB_BASE}/movie/${tmdbId}/videos`, { params: { api_key: TMDB_KEY }, timeout: 8000 }),
    ]);

    const detail = detailRes.data;
    const credits = creditsRes.data;
    const videos = videosRes.data.results || [];

    const cast = (credits.cast || []).slice(0, 6).map(c => ({
      name: c.name,
      role: c.character,
      photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '',
    }));

    const director = (credits.crew || []).find(c => c.job === 'Director')?.name || '';
    const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '';

    return { runtime: detail.runtime || 120, cast, director, trailerUrl };
  } catch {
    return { runtime: 120, cast: [], director: '', trailerUrl: '' };
  }
};

const toMovieDoc = async (tmdb) => {
  if (!tmdb.poster_path) return null;

  const genres = (tmdb.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean);
  const lang = LANG_MAP[tmdb.original_language] || 'English';

  const languages = [lang];
  if (INDIAN_LANGS.includes(lang)) {
    languages.push('Hindi');
    if (!languages.includes('English')) languages.push('English');
  } else if (lang !== 'English') {
    languages.push('English');
  }

  const { runtime, cast, director, trailerUrl } = await fetchDetails(tmdb.id);

  return {
    title: tmdb.title,
    description: tmdb.overview || 'No description available.',
    genre: genres.length > 0 ? genres : ['Drama'],
    languages,
    duration: runtime,
    releaseDate: tmdb.release_date || new Date().toISOString().split('T')[0],
    poster: `${POSTER_BASE}${tmdb.poster_path}`,
    banner: tmdb.backdrop_path ? `${BANNER_BASE}${tmdb.backdrop_path}` : '',
    cast,
    director,
    rating: Math.round(tmdb.vote_average * 10) / 10,
    trailerUrl,
    status: getStatus(tmdb.release_date),
    totalBookings: 0,
  };
};

const processBatch = async (batch) => {
  const results = await Promise.all(batch.map(tmdb => toMovieDoc(tmdb)));
  return results.filter(Boolean);
};

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cinebook');
  console.log('✅ Connected to MongoDB\n');
  console.log('🎬 Fetching movies from TMDB across all languages & genres...\n');

  // ── Fetch from many targeted endpoints ──────────────────────────────────────

  const fetches = await Promise.all([
    // Global popular/top-rated/now-playing/upcoming
    fetchPage('/movie/now_playing', 1),
    fetchPage('/movie/now_playing', 2),
    fetchPage('/movie/now_playing', 3),
    fetchPage('/movie/upcoming', 1),
    fetchPage('/movie/upcoming', 2),
    fetchPage('/movie/upcoming', 3),
    fetchPage('/movie/popular', 1),
    fetchPage('/movie/popular', 2),
    fetchPage('/movie/popular', 3),
    fetchPage('/movie/top_rated', 1),
    fetchPage('/movie/top_rated', 2),
    fetchPage('/movie/top_rated', 3),
    fetchPage('/movie/top_rated', 4),
    fetchPage('/movie/top_rated', 5),

    // ── Hindi / Bollywood ──────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'hi', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 2, { with_original_language: 'hi', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 3, { with_original_language: 'hi', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 1, { with_original_language: 'hi', sort_by: 'vote_average.desc', 'vote_count.gte': 500 }),
    fetchPage('/discover/movie', 2, { with_original_language: 'hi', sort_by: 'vote_average.desc', 'vote_count.gte': 500 }),

    // ── Tamil ──────────────────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'ta', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 2, { with_original_language: 'ta', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 1, { with_original_language: 'ta', sort_by: 'vote_average.desc', 'vote_count.gte': 200 }),

    // ── Telugu ─────────────────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'te', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 2, { with_original_language: 'te', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 1, { with_original_language: 'te', sort_by: 'vote_average.desc', 'vote_count.gte': 200 }),

    // ── Malayalam ─────────────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'ml', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 1, { with_original_language: 'ml', sort_by: 'vote_average.desc', 'vote_count.gte': 100 }),

    // ── Kannada ───────────────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'kn', sort_by: 'popularity.desc' }),

    // ── Bengali ───────────────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'bn', sort_by: 'popularity.desc' }),

    // ── Korean ────────────────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'ko', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 2, { with_original_language: 'ko', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 1, { with_original_language: 'ko', sort_by: 'vote_average.desc', 'vote_count.gte': 200 }),

    // ── Japanese ──────────────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'ja', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 2, { with_original_language: 'ja', sort_by: 'popularity.desc' }),

    // ── Spanish ───────────────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'es', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 1, { with_original_language: 'es', sort_by: 'vote_average.desc', 'vote_count.gte': 200 }),

    // ── French ────────────────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'fr', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 1, { with_original_language: 'fr', sort_by: 'vote_average.desc', 'vote_count.gte': 200 }),

    // ── Chinese ───────────────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'zh', sort_by: 'popularity.desc' }),

    // ── Turkish ───────────────────────────────────────────────────────────────
    fetchPage('/discover/movie', 1, { with_original_language: 'tr', sort_by: 'popularity.desc' }),

    // ── Genre-specific (to fill gaps) ─────────────────────────────────────────
    // Horror
    fetchPage('/discover/movie', 1, { with_genres: '27', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 2, { with_genres: '27', sort_by: 'popularity.desc' }),
    // Animation
    fetchPage('/discover/movie', 1, { with_genres: '16', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 2, { with_genres: '16', sort_by: 'popularity.desc' }),
    // Documentary
    fetchPage('/discover/movie', 1, { with_genres: '99', sort_by: 'vote_average.desc', 'vote_count.gte': 100 }),
    // Western
    fetchPage('/discover/movie', 1, { with_genres: '37', sort_by: 'vote_average.desc', 'vote_count.gte': 100 }),
    // War
    fetchPage('/discover/movie', 1, { with_genres: '10752', sort_by: 'vote_average.desc', 'vote_count.gte': 100 }),
    // Romance
    fetchPage('/discover/movie', 1, { with_genres: '10749', sort_by: 'popularity.desc' }),
    // Family
    fetchPage('/discover/movie', 1, { with_genres: '10751', sort_by: 'popularity.desc' }),
    // Music
    fetchPage('/discover/movie', 1, { with_genres: '10402', sort_by: 'popularity.desc' }),
    // Mystery
    fetchPage('/discover/movie', 1, { with_genres: '9648', sort_by: 'vote_average.desc', 'vote_count.gte': 200 }),
    // Sci-Fi
    fetchPage('/discover/movie', 1, { with_genres: '878', sort_by: 'popularity.desc' }),
    fetchPage('/discover/movie', 2, { with_genres: '878', sort_by: 'popularity.desc' }),
  ]);

  // Deduplicate by TMDB id
  const seen = new Set();
  const unique = fetches.flat().filter(m => {
    if (seen.has(m.id) || !m.poster_path) return false;
    seen.add(m.id);
    return true;
  });

  console.log(`📦 ${unique.length} unique movies found across all languages & genres`);
  console.log('⚙️  Fetching full details in parallel batches of 10...\n');

  const BATCH_SIZE = 10;
  const movieDocs = [];

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(unique.length / BATCH_SIZE);
    process.stdout.write(`\r   Batch ${batchNum}/${totalBatches} — ${Math.min(i + BATCH_SIZE, unique.length)}/${unique.length} movies processed...`);

    const results = await processBatch(batch);
    movieDocs.push(...results);

    if (i + BATCH_SIZE < unique.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`\n\n✅ ${movieDocs.length} movies ready`);
  console.log('💾 Upserting into MongoDB...\n');

  let inserted = 0, updated = 0, skipped = 0;

  for (const doc of movieDocs) {
    try {
      const existing = await Movie.findOne({ title: doc.title });
      if (existing) {
        await Movie.updateOne({ _id: existing._id }, {
          $set: {
            poster: doc.poster, banner: doc.banner, rating: doc.rating,
            cast: doc.cast, director: doc.director, trailerUrl: doc.trailerUrl,
            description: doc.description, duration: doc.duration,
            languages: doc.languages, genre: doc.genre, status: doc.status,
          }
        });
        updated++;
      } else {
        await Movie.create(doc);
        inserted++;
      }
    } catch {
      skipped++;
    }
  }

  console.log(`🎉 Seeding complete!`);
  console.log(`   ✅ Inserted : ${inserted} new movies`);
  console.log(`   🔄 Updated  : ${updated} existing movies`);
  console.log(`   ⚠️  Skipped  : ${skipped} (errors)\n`);

  // ── Final breakdown ──────────────────────────────────────────────────────────
  const total = await Movie.countDocuments();

  const langs = await Movie.aggregate([
    { $unwind: '$languages' },
    { $group: { _id: '$languages', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const genres = await Movie.aggregate([
    { $unwind: '$genre' },
    { $group: { _id: '$genre', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const statuses = await Movie.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  console.log(`📊 Total movies in database: ${total}\n`);
  console.log('🌍 Languages:');
  langs.forEach(l => console.log(`   ${l._id.padEnd(15)} ${l.count}`));
  console.log('\n🎭 Genres:');
  genres.forEach(g => console.log(`   ${g._id.padEnd(15)} ${g.count}`));
  console.log('\n📽️  Status:');
  statuses.forEach(s => console.log(`   ${s._id.padEnd(15)} ${s.count}`));

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error('\n❌ Seeder failed:', err.message);
  process.exit(1);
});
