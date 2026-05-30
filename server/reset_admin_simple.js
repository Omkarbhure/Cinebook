require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./src/models/User');

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) { console.log('❌ No admin found'); process.exit(1); }

  // Set a simple password
  admin.password = 'admin123';
  await admin.save();

  // Verify
  const bcrypt = require('bcryptjs');
  const check = await User.findOne({ role: 'admin' }).select('+password');
  const ok = await bcrypt.compare('admin123', check.password);

  console.log('✅ Admin password reset successfully');
  console.log('   Name    :', admin.name);
  console.log('   Email   :', admin.email);
  console.log('   Password: admin123');
  console.log('   Works   :', ok ? 'YES' : 'NO');
  mongoose.disconnect();
});
