/**
 * One-time script: remove duplicate shows (same theater + date + time)
 * Keeps the show with the most booked seats, deletes the rest.
 */
require('dotenv').config();
const mongoose = require('mongoose');
require('./src/models/Movie');
require('./src/models/Theater');
const Show = require('./src/models/Show');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cinebook').then(async () => {
  console.log('Connected. Scanning for duplicates...');

  // Find all groups with same theater + date + time
  const dups = await Show.aggregate([
    {
      $group: {
        _id: { theater: '$theater', date: '$date', time: '$time' },
        ids: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  console.log(`Found ${dups.length} duplicate groups`);

  let deleted = 0;
  for (const group of dups) {
    // Load all shows in this group
    const shows = await Show.find({ _id: { $in: group.ids } });

    // Sort: keep the one with the most booked seats (most data), delete the rest
    shows.sort((a, b) => {
      const bookedA = a.seats.filter(s => s.userId).length;
      const bookedB = b.seats.filter(s => s.userId).length;
      return bookedB - bookedA;
    });

    // Keep index 0, delete the rest
    const toDelete = shows.slice(1).map(s => s._id);
    await Show.deleteMany({ _id: { $in: toDelete } });
    deleted += toDelete.length;
    console.log(`  Deleted ${toDelete.length} duplicate(s) for theater ${group._id.theater} at ${group._id.time}`);
  }

  console.log(`\nDone. Removed ${deleted} duplicate shows.`);
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
