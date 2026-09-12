const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cinebook';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Warning: ${error.message}`);
    console.warn(`⚠️ Please ensure MongoDB is running at ${uri} or set MONGO_URI (e.g. MongoDB Atlas connection string) in server/.env`);
    return null;
  }
};

module.exports = connectDB;

