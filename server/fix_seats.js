/**
 * Fix shows with empty seats:
 * 1. Set rows=10, cols=12 on theaters missing those fields
 * 2. Regenerate seats for all shows that have 0 seats
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Theater = require('./src/models/Theater');
const Show = require('./src/models/Show');

const generateSeats = (rows, cols) => {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let category = 'silver';
      if (r >= rows - 2) category = 'platinum';
      else if (r >= rows - 5) category = 'gold';
      seats.push({ row: r, col: c, category, userId: null, bookingId: null });
    }
  }
  return seats;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected\n');

  // Step 1: Fix theaters missing rows/cols
  const badTheaters = await Theater.find({ $or: [{ rows: { $exists: false } }, { rows: null }, { cols: { $exists: false } }, { cols: null }] });
  console.log(`Found ${badTheaters.length} theaters missing rows/cols`);
  for (const t of badTheaters) {
    await Theater.updateOne({ _id: t._id }, { $set: { rows: 10, cols: 12 } });
    console.log(`  Fixed: ${t.name}`);
  }

  // Step 2: Fix shows with 0 seats or missing seats field
  const emptyShows = await Show.find({
    $or: [
      { seats: { $exists: false } },
      { seats: { $size: 0 } }
    ]
  }).populate('theater');
  console.log(`\nFound ${emptyShows.length} shows with 0 seats`);

  let fixed = 0;
  for (const show of emptyShows) {
    const rows = show.theater?.rows || 10;
    const cols = show.theater?.cols || 12;
    const seats = generateSeats(rows, cols);
    await Show.updateOne({ _id: show._id }, { $set: { seats } });
    fixed++;
    process.stdout.write(`\r  Fixed ${fixed}/${emptyShows.length} shows...`);
  }

  console.log(`\n\n✅ Done! Fixed ${fixed} shows`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
