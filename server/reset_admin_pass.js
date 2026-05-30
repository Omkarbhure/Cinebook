require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.findOne({ email: 'omkarbhure18@gmail.com' });
  if (!user) {
    console.log('❌ User not found');
    process.exit(1);
  }
  user.password = '123456';
  await user.save(); // pre-save hook will hash it
  console.log(`✅ Password reset to 123456 for ${user.email}`);
  process.exit();
});
