require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('./src/models/Movie');

const checkMovies = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cinebook');
        const movies = await Movie.find({}, 'title poster');
        console.log('--- MOVIE POSTERS IN DB ---');
        movies.forEach(m => {
            console.log(`${m.title}: ${m.poster}`);
        });
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkMovies();
