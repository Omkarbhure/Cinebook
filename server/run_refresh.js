/**
 * run_refresh.js — one-shot script to trigger refreshShows() directly.
 * Run: node run_refresh.js
 * Safe to run multiple times — scheduler is fully idempotent.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const { refreshShows } = require('./src/services/showScheduler');

(async () => {
  await connectDB();
  console.log('Running refreshShows()...\n');
  await refreshShows();
  console.log('\nDone. Disconnecting...');
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => { console.error(err.message); process.exit(1); });
