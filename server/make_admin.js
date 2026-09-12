require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  // Check existing admins
  const admins = await User.find({ role: 'admin' });
  console.log('Existing admins:', admins.map(u => ({ name: u.name, email: u.email })));

  // Promote omkar to admin (the email/password user)
  const user = await User.findOneAndUpdate(
    { email: 'omkarbhure18@gmail.com' },
    { role: 'admin' },
    { new: true }
  );

  if (user) {
    console.log(`✅ Promoted ${user.name} (${user.email}) to admin`);
  } else {
    console.log('User not found — creating admin user...');
    const newAdmin = await User.create({
      name: 'Admin',
      email: 'admin@cinebook.com',
      password: 'Admin@123',
      phone: '+910000000000',
      role: 'admin',
      isVerified: true,
    });
    console.log(`✅ Created admin: ${newAdmin.email} / password: Admin@123`);
  }

  process.exit();
});
