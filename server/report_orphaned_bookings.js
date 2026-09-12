/**
 * report_orphaned_bookings.js
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE-OFF assessment script — DO NOT run against production automatically.
 * Run manually: node report_orphaned_bookings.js > orphan_report.txt
 *
 * Finds Booking documents whose referenced Show no longer exists in the DB.
 * These are bookings that were orphaned by the old show-cleanup bug (Bug #1),
 * which used 'seats.userId': null and deleted shows with real paid bookings.
 *
 * Output:
 *   - Total orphaned bookings count
 *   - Per-booking: bookingId, user email, movie title, amount, status, createdAt
 *   - Total financial exposure (sum of totalAmount for non-cancelled orphans)
 *
 * After reviewing the report, a human can decide to:
 *   (a) Restore show documents from a backup, or
 *   (b) Patch orphaned bookings with snapshot data so they remain readable, or
 *   (c) Issue manual refunds for 'paid' orphaned bookings.
 * ─────────────────────────────────────────────────────────────────────────────
 */
require('dotenv').config();
const mongoose = require('mongoose');
require('./src/models/Movie');
require('./src/models/Theater');
require('./src/models/User');
const Show = require('./src/models/Show');
const Booking = require('./src/models/Booking');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // Fetch all bookings that are not cancelled/refunded (those are the risky ones)
  const allBookings = await Booking.find({})
    .populate('movie', 'title')
    .populate('user', 'name email')
    .lean();

  const showIds = new Set(
    (await Show.find({}, '_id').lean()).map(s => s._id.toString())
  );

  const orphans = allBookings.filter(b => {
    const showRef = b.show?.toString();
    return showRef && !showIds.has(showRef);
  });

  if (orphans.length === 0) {
    console.log('✅ No orphaned bookings found. Database is clean.');
    await mongoose.disconnect();
    return;
  }

  console.log(`⚠️  Found ${orphans.length} orphaned booking(s) (show no longer exists):\n`);
  console.log('─'.repeat(90));

  let financialExposure = 0;

  for (const b of orphans) {
    const isPaid = b.paymentStatus === 'paid' && b.status !== 'cancelled';
    if (isPaid) financialExposure += b.totalAmount || 0;

    console.log([
      `Booking ID : ${b.bookingId || b._id}`,
      `User       : ${b.user?.name || 'unknown'} <${b.user?.email || 'no-email'}>`,
      `Movie      : ${b.movie?.title || '(deleted)'}`,
      `Show ref   : ${b.show}  ← MISSING`,
      `Amount     : ₹${b.totalAmount}`,
      `Pay status : ${b.paymentStatus}`,
      `Status     : ${b.status}`,
      `Created    : ${new Date(b.createdAt).toLocaleString('en-IN')}`,
      '─'.repeat(90),
    ].join('\n'));
  }

  console.log(`\n💰 Total financial exposure (paid, non-cancelled): ₹${financialExposure}`);
  console.log(`\nAction required: review each orphan above and issue refunds / restore data as needed.`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Script error:', err.message);
  process.exit(1);
});
