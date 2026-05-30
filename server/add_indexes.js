require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  console.log('Adding indexes...\n');

  // Movies — most common query patterns
  await db.collection('movies').createIndex({ status: 1, releaseDate: -1 }, { name: 'status_releaseDate' });
  await db.collection('movies').createIndex({ status: 1, rating: -1 }, { name: 'status_rating' });
  await db.collection('movies').createIndex({ genre: 1, status: 1 }, { name: 'genre_status' });
  await db.collection('movies').createIndex({ languages: 1, status: 1 }, { name: 'languages_status' });
  await db.collection('movies').createIndex({ title: 1 }, { name: 'title_asc' });
  console.log('✅ Movies indexes added');

  // Shows — date + theater + movie lookups
  await db.collection('shows').createIndex({ movie: 1, date: 1, isActive: 1 }, { name: 'movie_date_active' });
  await db.collection('shows').createIndex({ theater: 1, date: 1, isActive: 1 }, { name: 'theater_date_active' });
  await db.collection('shows').createIndex({ date: 1, isActive: 1 }, { name: 'date_active' });
  console.log('✅ Shows indexes added');

  // Bookings — user lookups and admin queries
  await db.collection('bookings').createIndex({ user: 1, createdAt: -1 }, { name: 'user_createdAt' });
  await db.collection('bookings').createIndex({ paymentStatus: 1, createdAt: -1 }, { name: 'paymentStatus_createdAt' });
  await db.collection('bookings').createIndex({ status: 1, createdAt: -1 }, { name: 'status_createdAt' });
  await db.collection('bookings').createIndex({ bookingId: 1 }, { unique: true, sparse: true, name: 'bookingId_unique' });
  console.log('✅ Bookings indexes added');

  // Theaters — city lookups
  await db.collection('theaters').createIndex({ city: 1, name: 1 }, { name: 'city_name' });
  console.log('✅ Theaters indexes added');

  // List all indexes
  const movieIndexes = await db.collection('movies').indexes();
  console.log('\n📋 Movies indexes:', movieIndexes.map(i => i.name).join(', '));

  const showIndexes = await db.collection('shows').indexes();
  console.log('📋 Shows indexes:', showIndexes.map(i => i.name).join(', '));

  console.log('\n✅ All indexes created successfully');
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
