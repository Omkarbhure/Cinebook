require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const http = require('http');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Movie = require('./src/models/Movie');
  const movies = await Movie.find({ status: 'now_playing' }).select('title poster').limit(20);

  console.log('Checking poster URL domains:\n');
  const domains = {};
  movies.forEach(m => {
    try {
      const url = new URL(m.poster);
      domains[url.hostname] = (domains[url.hostname] || 0) + 1;
    } catch {
      domains['INVALID'] = (domains['INVALID'] || 0) + 1;
    }
  });

  Object.entries(domains).forEach(([domain, count]) => {
    console.log(`  ${domain}: ${count} movies`);
  });

  // Check if posters are TMDB (fast CDN) or Unsplash (slow)
  const tmdb = movies.filter(m => m.poster?.includes('tmdb') || m.poster?.includes('image.tmdb'));
  const unsplash = movies.filter(m => m.poster?.includes('unsplash'));
  const other = movies.filter(m => !m.poster?.includes('tmdb') && !m.poster?.includes('unsplash'));

  console.log(`\n📊 Poster sources (first 20 movies):`);
  console.log(`  TMDB CDN (fast): ${tmdb.length}`);
  console.log(`  Unsplash (slow, external): ${unsplash.length}`);
  console.log(`  Other: ${other.length}`);

  if (unsplash.length > 0) {
    console.log('\n⚠️  Unsplash posters (these load slowly):');
    unsplash.slice(0, 5).forEach(m => console.log(`  - ${m.title}: ${m.poster.substring(0, 60)}...`));
  }

  // Check total poster count by domain across all movies
  const all = await Movie.find({}).select('poster');
  const allDomains = {};
  all.forEach(m => {
    try {
      const url = new URL(m.poster);
      allDomains[url.hostname] = (allDomains[url.hostname] || 0) + 1;
    } catch {
      allDomains['INVALID'] = (allDomains['INVALID'] || 0) + 1;
    }
  });
  console.log('\n📊 All 90 movies poster domains:');
  Object.entries(allDomains).sort((a,b) => b[1]-a[1]).forEach(([d, c]) => console.log(`  ${d}: ${c}`));

  mongoose.disconnect();
});
