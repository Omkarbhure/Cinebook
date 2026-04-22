const mongoose = require('mongoose');
const Movie = require('./src/models/Movie');

const fixPosters = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/cinebook');
    console.log("Connected to MongoDB for repairs...");

    const movies = await Movie.find();
    console.log(`Found ${movies.length} movies. checking posters...`);

    const fallbackImages = [
      "https://images.unsplash.com/photo-1542204112-9702012ec73c",
      "https://images.unsplash.com/photo-1485043433441-db091a258e5a",
      "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f",
      "https://images.unsplash.com/photo-1473580044384-7ba9967e16a0",
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26"
    ];

    for (const movie of movies) {
      let updated = false;
      
      // If poster is missing or is the old TMDB link
      if (!movie.poster || movie.poster.includes('tmdb.org')) {
        movie.poster = `${fallbackImages[Math.floor(Math.random() * fallbackImages.length)]}?auto=format&fit=crop&q=80&w=600`;
        updated = true;
      }
      
      // If banner is missing or is the old TMDB link
      if (!movie.banner || movie.banner.includes('tmdb.org')) {
        movie.banner = `${fallbackImages[Math.floor(Math.random() * fallbackImages.length)]}?auto=format&fit=crop&q=80&w=1200`;
        updated = true;
      }

      if (updated) {
        await movie.save();
        console.log(`Fixed visuals for: ${movie.title}`);
      }
    }

    console.log("Visuals repair complete! ✨");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fixPosters();
