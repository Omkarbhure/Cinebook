/**
 * City Seeder — runs on startup
 * Ensures every city in ALL_CITIES has 3 theaters.
 * The showScheduler handles creating shows for all theaters.
 */

const ALL_CITIES = [
  'Mumbai','Delhi','Bengaluru','Pune','Hyderabad','Chennai','Kolkata',
  'Nagpur','Nashik','Aurangabad','Nanded','Solapur','Amravati',
  'Jaipur','Surat','Ahmedabad','Vadodara','Indore','Bhopal',
  'Lucknow','Kanpur','Agra','Varanasi','Patna','Ranchi',
  'Bhubaneswar','Visakhapatnam','Vijayawada','Coimbatore','Madurai',
  'Kochi','Thiruvananthapuram','Mangaluru','Mysuru',
  'Chandigarh','Ludhiana','Amritsar','Dehradun','Guwahati',
];

const THEATER_TEMPLATES = [
  { prefix: 'PVR',   suffix: 'Cinemas',   facilities: ['Dolby Atmos', 'Recliner', 'Cafe'] },
  { prefix: 'INOX',  suffix: 'Multiplex', facilities: ['4K Laser', 'Recliner', 'Bar'] },
  { prefix: 'Miraj', suffix: 'Cinemas',   facilities: ['Dolby', 'Snack Bar'] },
];

const getNext7Days = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + i);
    days.push(new Date(d));
  }
  return days;
};

const seedAllCities = async () => {
  try {
    const Theater = require('../models/Theater');
    const Movie   = require('../models/Movie');
    const Show    = require('../models/Show');

    // Auto-fix movies: if releaseDate is in the past, mark as now_playing
    const now = new Date();
    const fixedMovies = await Movie.updateMany(
      { releaseDate: { $lte: now }, status: 'upcoming' },
      { $set: { status: 'now_playing' } }
    );
    if (fixedMovies.modifiedCount > 0) {
      console.log(`[CitySeeder] Marked ${fixedMovies.modifiedCount} released movies as now_playing.`);
    }

    // Fix #3: Only delete PAST shows, not all unbooked shows
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    const deleted = await Show.deleteMany({ date: { $lt: todayUTC }, 'seats.userId': null });
    if (deleted.deletedCount > 0) {
      console.log(`[CitySeeder] Cleared ${deleted.deletedCount} past shows.`);
    }

    let citiesCreated = 0;

    for (const city of ALL_CITIES) {
      const existing = await Theater.countDocuments({ city: new RegExp('^' + city + '$', 'i') });
      if (existing > 0) continue;

      for (const tmpl of THEATER_TEMPLATES) {
        await Theater.create({
          name:       `${tmpl.prefix} ${city} ${tmpl.suffix}`,
          address:    `${tmpl.prefix} Mall, ${city}`,
          city,
          rows: 10, cols: 12,
          facilities: tmpl.facilities,
          rating:     parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
          location:   { type: 'Point', coordinates: [0, 0] },
        });
      }
      citiesCreated++;
    }

    if (citiesCreated > 0) {
      console.log(`[CitySeeder] Created theaters for ${citiesCreated} new cities.`);
    } else {
      console.log('[CitySeeder] All cities already have theaters.');
    }
  } catch (err) {
    console.error('[CitySeeder] Error:', err.message);
  }
};

module.exports = { seedAllCities };
