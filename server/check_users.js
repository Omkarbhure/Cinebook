const mongoose = require('mongoose');
const User = require('./src/models/User');

const checkUsers = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/cinebook');
        const googleUsers = await User.find({ googleId: { $exists: true } });
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(3);
        
        console.log('--- GOOGLE USERS ---');
        console.log(JSON.stringify(googleUsers, null, 2));
        
        console.log('\n--- 3 MOST RECENT USERS ---');
        console.log(JSON.stringify(recentUsers, null, 2));
        
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkUsers();
