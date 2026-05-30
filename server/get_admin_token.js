require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./src/models/User');

  // Set admin password properly via mongoose (triggers pre-save hash)
  const admin = await User.findOne({ role: 'admin' });
  admin.password = 'Admin@123';
  await admin.save();

  // Generate token
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  console.log('ADMIN_TOKEN=' + token);
  console.log('ADMIN_EMAIL=' + admin.email);
  mongoose.disconnect();
});
