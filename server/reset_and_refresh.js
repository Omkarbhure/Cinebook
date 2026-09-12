/**
 * reset_and_refresh.js
 * Clears ALL unbooked shows (no paid seats) and regenerates from scratch
 * using the new scheduler logic that guarantees every movie in every city.
 *
 * Safe: only deletes shows with zero booked seats (userId: null on all seats).
 * Shows with real bookings are never touched.
 */
require('dotenv').config();
const mongoose  = require('mongoose');
const connectDB = require('./src/config/db');
const Show      = require('./src/models/Show');
const { refreshShows } = require('./src/services/showScheduler');

(async () => {
  await connectDB();

  // Count before
  const before = await Show.countDocuments();
  console.log(`Shows before cleanup: ${before}`);

  // Delete ALL unbooked shows (past AND future) so the new scheduler
  // can regenerate from a clean slate with the correct per-movie assignment.
  const deleted = await Show.deleteMany({
    seats: { $not: { $elemMatch: { userId: { $ne: null } } } },
  });
  console.log(`Deleted ${deleted.deletedCount} unbooked shows`);

  const withBookings = await Show.countDocuments();
  console.log(`Shows with real bookings kept: ${withBookings}`);

  // Regenerate
  console.log('\nRunning refreshShows() with new scheduler...\n');
  await refreshShows();

  const after = await Show.countDocuments();
  console.log(`\nShows after refresh: ${after}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => { console.error(err.message); process.exit(1); });
