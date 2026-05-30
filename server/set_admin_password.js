require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./src/models/User');

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) { console.log('No admin found'); process.exit(1); }

  // Set password — pre-save hook will hash it
  admin.password = 'Admin@123';
  await admin.save();

  // Verify it saved
  const check = await User.findOne({ role: 'admin' }).select('+password');
  const bcrypt = require('bcryptjs');
  const ok = await bcrypt.compare('Admin@123', check.password);

  console.log('✅ Admin credentials:');
  console.log('   Email   :', admin.email);
  console.log('   Name    :', admin.name);
  console.log('   Password: Admin@123');
  console.log('   Verified:', ok ? 'YES — password works' : 'NO — something went wrong');

  mongoose.disconnect();
});
