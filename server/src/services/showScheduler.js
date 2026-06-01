/**
 * Show Scheduler — ensures every theater has shows for today + next 2 days
 * Uses UTC dates throughout to avoid timezone issues on Render (UTC server).
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

const getUTCMidnight = (offsetDays = 0) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
};

const getNext3Days = () => [
  getUTCMidnight(0),
  getUTCMidnight(1),
  getUTCMidnight(2),
];

const refreshShows = async () => {
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    const Show    = require('../models/Show');
    const Theater = require('../models/Theater');
    const Movie   = require('../models/Movie');

    const todayUTC = getUTCMidnight(0);

    // Delete past shows with no bookings
    const deleted = await Show.deleteMany({
      date: { $lt: todayUTC },
      'seats.userId': null,
    });

    const movies   = await Movie.find({});
    const theaters = await Theater.find({});
    const days     = getNext3Days();

    if (movies.length === 0 || theaters.length === 0) {
      console.log('[Scheduler] No movies or theaters found, skipping.');
      isRefreshing = false;
      return;
    }

    // Bulk fetch existing shows for the next 3 days
    const existingShows = await Show.find({
      date: { $gte: days[0], $lte: days[days.length - 1] },
    }).select('movie theater date time');

    // Build sets for deduplication
    const existingKeys = new Set(
      existingShows.map(s =>
        s.movie.toString() + '_' + s.theater.toString() + '_' +
        s.date.toISOString().split('T')[0] + '_' + s.time
      )
    );
    const takenSlots = new Set(
      existingShows.map(s =>
        s.theater.toString() + '_' +
        s.date.toISOString().split('T')[0] + '_' + s.time
      )
    );

    const toCreate = [];

    for (let ti = 0; ti < theaters.length; ti++) {
      const theater = theaters[ti];
      const startIdx = ti % movies.length;
      const rotated  = [
        ...movies.slice(startIdx),
        ...movies.slice(0, startIdx),
      ].slice(0, SHOW_TIMES.length);

      for (const day of days) {
        const dateStr = day.toISOString().split('T')[0];

        for (let slot = 0; slot < rotated.length; slot++) {
          const movie    = rotated[slot];
          const time     = SHOW_TIMES[slot];
          const format   = SHOW_FORMATS[slot];
          const movieKey = movie._id.toString() + '_' + theater._id.toString() + '_' + dateStr + '_' + time;
          const slotKey  = theater._id.toString() + '_' + dateStr + '_' + time;

          if (existingKeys.has(movieKey)) continue;
          if (takenSlots.has(slotKey)) continue;

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
      const CHUNK_SIZE = 20;
      for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
        await Show.insertMany(toCreate.slice(i, i + CHUNK_SIZE), { ordered: false });
      }
    }

    console.log('[Scheduler] deleted:', deleted.deletedCount, '| created:', toCreate.length, '| theaters:', theaters.length);
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
