/**
 * City Seeder — runs once on startup
 * Ensures every city in BASE_CITIES has 3 theaters + shows for next 7 days
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

const SHOW_TIMES   = ['10:00 AM', '01:00 PM', '04:00 PM', '07:00 PM', '10:00 PM'];
const SHOW_FORMATS = ['2D', '3D', 'IMAX', '2D', '3D'];

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

const getNext7Days = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    days.push(new Date(d));
  }
  return days;
};

const seedAllCities = async () => {
  try {
    const Theater = require('../models/Theater');
    const Show    = require('../models/Show');
    const Movie   = require('../models/Movie');

    const movies = await Movie.find({});
    if (movies.length === 0) {
      console.log('[CitySeeder] No movies found, skipping.');
      return;
    }

    const days = getNext7Days();
    let citiesCreated = 0;
    let showsCreated  = 0;

    for (const city of ALL_CITIES) {
      // Check if city already has theaters
      const existing = await Theater.countDocuments({ city: new RegExp('^' + city + '$', 'i') });
      if (existing > 0) continue; // already seeded

      for (let t = 0; t < THEATER_TEMPLATES.length; t++) {
        const tmpl = THEATER_TEMPLATES[t];
        const theater = await Theater.create({
          name:       `${tmpl.prefix} ${city} ${tmpl.suffix}`,
          address:    `${tmpl.prefix} Mall, ${city}`,
          city,
          rows: 10, cols: 12,
          facilities: tmpl.facilities,
          rating:     parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
          location:   { type: 'Point', coordinates: [0, 0] },
        });

        // Pick 5 movies rotating by theater index
        const startIdx = t % movies.length;
        const selected = [...movies.slice(startIdx), ...movies.slice(0, startIdx)].slice(0, 5);

        const toCreate = [];
        for (const day of days) {
          for (let slot = 0; slot < selected.length; slot++) {
            toCreate.push({
              movie:    selected[slot]._id,
              theater:  theater._id,
              date:     new Date(day),
              time:     SHOW_TIMES[slot],
              language: selected[slot].languages?.[0] || 'English',
              format:   SHOW_FORMATS[slot],
              pricing:  { silver: 150, gold: 250, platinum: 400 },
              seats:    generateSeats(),
              isActive: true,
            });
          }
        }

        // Insert in chunks of 20
        for (let i = 0; i < toCreate.length; i += 20) {
          await Show.insertMany(toCreate.slice(i, i + 20), { ordered: false });
        }
        showsCreated += toCreate.length;
      }
      citiesCreated++;
    }

    if (citiesCreated > 0) {
      console.log(`[CitySeeder] Seeded ${citiesCreated} cities, ${showsCreated} shows created.`);
    } else {
      console.log('[CitySeeder] All cities already seeded.');
    }
  } catch (err) {
    console.error('[CitySeeder] Error:', err.message);
  }
};

module.exports = { seedAllCities };
