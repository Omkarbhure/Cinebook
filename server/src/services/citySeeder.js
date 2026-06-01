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

const seedAllCities = async () => {
  try {
    const Theater = require('../models/Theater');

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
