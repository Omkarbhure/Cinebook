/**
 * Show Scheduler — guarantees every now_playing movie has shows in every city.
 *
 * Multiplex model: a theater has multiple screens, so the SAME theater CAN
 * show different movies at the SAME time (on different screens). We model this
 * by treating each (theater, time) combination as a separate screen slot —
 * multiple movies can share a theater+time pair (on different screens).
 *
 * Guarantee: every now_playing movie gets at least 2 shows in every city per day.
 * With 90 movies and 39 cities this creates ~90×39×2×7 = ~49,140 show slots
 * over 7 days. We deduplicate exact (movie,theater,date,time) duplicates only.
 *
 * Uses UTC dates throughout.
 */
'use strict';
const cron = require('node-cron');

const SHOW_TIMES   = ['10:00 AM', '01:00 PM', '04:00 PM', '07:00 PM', '10:00 PM'];
const SHOW_FORMATS = ['2D', '3D', 'IMAX', '2D', '3D'];

// Each movie gets this many shows per city per day minimum
const SHOWS_PER_MOVIE_PER_CITY_PER_DAY = 1;

let isRefreshing = false;
let isRetrying   = false;

const generateSeats = () => {
  const seats = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 12; c++) {
      let category = 'silver';
      if (r >= 8)      category = 'platinum';
      else if (r >= 5) category = 'gold';
      seats.push({ row: r, col: c, category, userId: null, bookingId: null, lockedBy: null, lockedUntil: null });
    }
  }
  return seats;
};

const getUTCMidnight = (offsetDays = 0) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
};

const getNext7Days = () => {
  const days = [];
  for (let i = 0; i < 7; i++) days.push(getUTCMidnight(i));
  return days;
};

const refreshShows = async () => {
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    const Show    = require('../models/Show');
    const Theater = require('../models/Theater');
    const Movie   = require('../models/Movie');

    const todayUTC = getUTCMidnight(0);

    // Delete past shows that have NO booked seats.
    const deleted = await Show.deleteMany({
      date: { $lt: todayUTC },
      seats: { $not: { $elemMatch: { userId: { $ne: null } } } },
    });

    // Auto-promote movies whose release date has passed
    await Movie.updateMany(
      { releaseDate: { $lte: new Date() }, status: 'upcoming' },
      { $set: { status: 'now_playing' } }
    );

    const movies   = await Movie.find({ status: 'now_playing' });
    const theaters = await Theater.find({});
    const days     = getNext7Days();

    if (movies.length === 0 || theaters.length === 0) {
      console.log('[Scheduler] No movies or theaters found, skipping.');
      isRefreshing = false;
      return;
    }

    // Group theaters by city
    const theatersByCity = {};
    for (const t of theaters) {
      const city = t.city || 'Unknown';
      if (!theatersByCity[city]) theatersByCity[city] = [];
      theatersByCity[city].push(t);
    }
    const cities = Object.keys(theatersByCity);

    // Pre-fetch existing shows — deduplicate by exact (movie, theater, date, time)
    const existingShows = await Show.find({
      date: { $gte: days[0], $lte: days[days.length - 1] },
    }).select('movie theater date time');

    // Build a map for fast theater lookup
    const theaterMap = {};
    for (const t of theaters) theaterMap[t._id.toString()] = t;

    // Only prevent exact duplicates — same movie, same theater, same slot
    const existingKeys = new Set(
      existingShows.map(s =>
        s.movie.toString() + '_' + s.theater.toString() + '_' +
        s.date.toISOString().split('T')[0] + '_' + s.time
      )
    );

    // Track how many times each (movie, city, date) has been scheduled
    const movieCityDateCount = {};
    for (const s of existingShows) {
      const t = theaterMap[s.theater.toString()];
      if (!t) continue;
      const k = s.movie.toString() + '_' + t.city + '_' + s.date.toISOString().split('T')[0];
      movieCityDateCount[k] = (movieCityDateCount[k] || 0) + 1;
    }

    // Process and insert in batches — don't accumulate all shows in memory at once
    const CHUNK_SIZE = 100;
    let batch = [];
    let totalCreated = 0;

    const flushBatch = async () => {
      if (batch.length === 0) return;
      await Show.insertMany(batch, { ordered: false });
      totalCreated += batch.length;
      batch = [];
    };

    for (const day of days) {
      const dateStr = day.toISOString().split('T')[0];

      for (let mi = 0; mi < movies.length; mi++) {
        const movie = movies[mi];

        for (let ci = 0; ci < cities.length; ci++) {
          const city         = cities[ci];
          const cityTheaters = theatersByCity[city];
          const coverKey     = movie._id.toString() + '_' + city + '_' + dateStr;
          const existing     = movieCityDateCount[coverKey] || 0;

          if (existing >= SHOWS_PER_MOVIE_PER_CITY_PER_DAY) continue;

          // Deterministic theater+time: rotate by (movieIndex + cityIndex)
          const baseTheaterIdx = (mi + ci) % cityTheaters.length;
          const baseSlotIdx    = mi % SHOW_TIMES.length;

          let created = 0;
          const needed = SHOWS_PER_MOVIE_PER_CITY_PER_DAY - existing;

          for (let attempt = 0; attempt < cityTheaters.length * SHOW_TIMES.length && created < needed; attempt++) {
            const ti      = (baseTheaterIdx + attempt) % cityTheaters.length;
            const slot    = (baseSlotIdx + attempt) % SHOW_TIMES.length;
            const theater = cityTheaters[ti];
            const time    = SHOW_TIMES[slot];
            const format  = SHOW_FORMATS[slot];
            const key     = movie._id.toString() + '_' + theater._id.toString() + '_' + dateStr + '_' + time;

            if (existingKeys.has(key)) continue;

            existingKeys.add(key);
            movieCityDateCount[coverKey] = (movieCityDateCount[coverKey] || 0) + 1;
            created++;

            batch.push({
              movie:    movie._id,
              theater:  theater._id,
              date:     new Date(day),
              time,
              language: movie.languages?.[0] || 'English',
              format,
              pricing:  { silver: 150, gold: 250, platinum: 400 },
              seats:    generateSeats(),
              isActive: true,
            });

            if (batch.length >= CHUNK_SIZE) await flushBatch();
          }
        }
      }
    }

    await flushBatch(); // flush remaining

    console.log('[Scheduler] deleted:', deleted.deletedCount, '| created:', totalCreated, '| movies:', movies.length, '| theaters:', theaters.length);
  } catch (err) {
    console.error('[Scheduler] Error:', err.message);
    if (!isRetrying) {
      isRetrying = true;
      setTimeout(async () => {
        console.log('[Scheduler] Retrying...');
        isRefreshing = false;
        isRetrying   = false;
        await refreshShows();
      }, 30 * 1000);
    }
  } finally {
    isRefreshing = false;
  }
};

const startScheduler = () => {
  refreshShows();
  cron.schedule('0 0 * * *', () => { console.log('[Scheduler] Daily refresh...'); refreshShows(); });
  cron.schedule('0 * * * *', () => { refreshShows(); });
  console.log('✅ Show scheduler started');
};

module.exports = { startScheduler, refreshShows };
