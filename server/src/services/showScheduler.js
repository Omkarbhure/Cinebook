/**
 * Show Scheduler — ensures every theater has shows for today + next 2 days
 *
 * Time assignment rules (permanent fix for duplicate times):
 * - Each theater gets exactly 5 shows per day (one per time slot)
 * - Each time slot is used by exactly ONE movie per theater per day
 * - Movies rotate across theaters so the same movie shows at different
 *   times in different theaters (realistic scheduling)
 * - If there are more than 5 movies, only 5 are scheduled per theater
 *   per day (the 5 are picked by rotating the movie list per theater)
 */
const cron = require('node-cron');

const SHOW_TIMES   = ['10:00 AM', '01:00 PM', '04:00 PM', '07:00 PM', '10:00 PM'];
const SHOW_FORMATS = ['2D', '3D', 'IMAX', '2D', '3D'];

let isRefreshing = false;
let isRetrying   = false;

const generateSeats = () => {
  const seats = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 12; c++) {
      let category = 'silver';
      if (r >= 8) category = 'platinum';
      else if (r >= 5) category = 'gold';
      seats.push({ row: r, col: c, category, userId: null, bookingId: null, lockedBy: null, lockedUntil: null });
    }
  }
  return seats;
};

const getLocalMidnight = (offsetDays = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
};

const getNext3Days = () => [
  getLocalMidnight(0),
  getLocalMidnight(1),
  getLocalMidnight(2),
];

const refreshShows = async () => {
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    const Show    = require('../models/Show');
    const Theater = require('../models/Theater');
    const Movie   = require('../models/Movie');

    const todayLocal = getLocalMidnight(0);

    // Delete past shows with no bookings
    const deleted = await Show.deleteMany({
      date: { $lt: todayLocal },
      'seats.userId': null,
    });

    const movies   = await Movie.find({});
    const theaters = await Theater.find({});
    const days     = getNext3Days();

    if (movies.length === 0 || theaters.length === 0) return;

    // Bulk fetch existing shows for the next 3 days
    const existingShows = await Show.find({
      date: { $gte: days[0], $lte: days[days.length - 1] },
    }).select('movie theater date time');

    // Build a Set of existing keys: movieId_theaterId_dateStr_time
    const existingKeys = new Set(
      existingShows.map(s =>
        s.movie.toString() + '_' + s.theater.toString() + '_' +
        s.date.toISOString().split('T')[0] + '_' + s.time
      )
    );

    // Also track which time slots are already taken per theater+date
    // to prevent scheduling two movies at the same time in the same theater
    // Key: theaterId_dateStr_time → true
    const takenSlots = new Set(
      existingShows.map(s =>
        s.theater.toString() + '_' +
        s.date.toISOString().split('T')[0] + '_' + s.time
      )
    );

    const toCreate = [];

    for (let ti = 0; ti < theaters.length; ti++) {
      const theater = theaters[ti];

      for (const day of days) {
        const dateStr = day.toISOString().split('T')[0];

        // Pick up to 5 movies for this theater on this day.
        // Rotate the starting index by theater index so different theaters
        // show different movies at the same time slot.
        const startIdx = ti % movies.length;
        const rotated  = [
          ...movies.slice(startIdx),
          ...movies.slice(0, startIdx),
        ].slice(0, SHOW_TIMES.length); // max 5 movies per theater per day

        for (let slot = 0; slot < rotated.length; slot++) {
          const movie     = rotated[slot];
          const time      = SHOW_TIMES[slot];   // slot 0→10AM, 1→1PM, etc.
          const format    = SHOW_FORMATS[slot];
          const movieKey  = movie._id.toString() + '_' + theater._id.toString() + '_' + dateStr + '_' + time;
          const slotKey   = theater._id.toString() + '_' + dateStr + '_' + time;

          // Skip if this exact show already exists
          if (existingKeys.has(movieKey)) continue;

          // Skip if this time slot is already taken in this theater on this day
          if (takenSlots.has(slotKey)) continue;

          // Mark slot as taken so we don't double-schedule within this batch
          takenSlots.add(slotKey);
          existingKeys.add(movieKey);

          toCreate.push({
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
        }
      }
    }

    if (toCreate.length > 0) {
      // Insert in chunks of 20 to avoid memory spikes on free-tier servers
      const CHUNK_SIZE = 20;
      for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
        await Show.insertMany(toCreate.slice(i, i + CHUNK_SIZE), { ordered: false });
      }
    }

    if (deleted.deletedCount > 0 || toCreate.length > 0) {
      console.log('[Scheduler] deleted:', deleted.deletedCount, '| created:', toCreate.length);
    }
  } catch (err) {
    console.error('[Scheduler] Error:', err.message);
    if (!isRetrying) {
      isRetrying = true;
      setTimeout(async () => {
        console.log('[Scheduler] Retrying after error...');
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
