require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('./models/Movie');
const Theater = require('./models/Theater');
const Show = require('./models/Show');
const User = require('./models/User');

const movies = [
  {
    title: "The Shawshank Redemption",
    description: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
    genre: ["Drama"],
    languages: ["English"],
    duration: 142,
    releaseDate: "1994-09-22",
    poster: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1200",
    rating: 9.3,
    status: "now_playing"
  },
  {
    title: "The Godfather",
    description: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
    genre: ["Crime", "Drama"],
    languages: ["English", "Italian"],
    duration: 175,
    releaseDate: "1972-03-24",
    poster: "https://images.unsplash.com/photo-1543165796-5426273ea458?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1542204112-9702012ec73c?auto=format&fit=crop&q=80&w=1200",
    rating: 9.2,
    status: "now_playing"
  },
  {
    title: "The Dark Knight",
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    genre: ["Action", "Crime", "Drama"],
    languages: ["English", "Hindi"],
    duration: 152,
    releaseDate: "2008-07-18",
    poster: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1485043433441-db091a258e5a?auto=format&fit=crop&q=80&w=1200",
    rating: 9.1,
    status: "now_playing"
  },
  {
    title: "12 Angry Men",
    description: "The jury in a New York City murder trial is frustrated by a single member whose skeptical caution forces them to more carefully consider the evidence before jumping to a hasty verdict.",
    genre: ["Crime", "Drama"],
    languages: ["English"],
    duration: 96,
    releaseDate: "1957-04-10",
    poster: "https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1200",
    rating: 9.0,
    status: "now_playing"
  },
  {
    title: "Schindler's List",
    description: "In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.",
    genre: ["Biography", "Drama", "History"],
    languages: ["English", "German"],
    duration: 195,
    releaseDate: "1993-12-15",
    poster: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1524712245354-2c4e5e7124c5?auto=format&fit=crop&q=80&w=1200",
    rating: 9.0,
    status: "now_playing"
  },
  {
    title: "The Lord of the Rings: The Return of the King",
    description: "Gandalf and Aragorn lead the World of Men against Sauron's army to draw his gaze from Frodo and Sam as they approach Mount Doom with the One Ring.",
    genre: ["Action", "Adventure", "Drama"],
    languages: ["English"],
    duration: 201,
    releaseDate: "2003-12-17",
    poster: "https://images.unsplash.com/photo-1461360228754-6e81c478c882?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&q=80&w=1200",
    rating: 9.0,
    status: "now_playing"
  },
  {
    title: "Pulp Fiction",
    description: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    genre: ["Crime", "Drama"],
    languages: ["English"],
    duration: 154,
    releaseDate: "1994-10-14",
    poster: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?auto=format&fit=crop&q=80&w=1200",
    rating: 8.8,
    status: "now_playing"
  },
  {
    title: "Inception",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    genre: ["Action", "Adventure", "Sci-Fi"],
    languages: ["English", "Japanese"],
    duration: 148,
    releaseDate: "2010-07-16",
    poster: "https://images.unsplash.com/photo-1500462859233-0bb2404c367b?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1200",
    rating: 8.8,
    status: "now_playing"
  },
  {
    title: "Fight Club",
    description: "An insomniac office worker and a devil-may-care shoemaker form an underground fight club that evolves into something much, much more.",
    genre: ["Drama"],
    languages: ["English"],
    duration: 139,
    releaseDate: "1999-10-15",
    poster: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1514320291944-80aa2f7be474?auto=format&fit=crop&q=80&w=1200",
    rating: 8.8,
    status: "now_playing"
  },
  {
    title: "The Matrix",
    description: "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.",
    genre: ["Action", "Sci-Fi"],
    languages: ["English"],
    duration: 136,
    releaseDate: "1999-03-31",
    poster: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200",
    rating: 8.7,
    status: "now_playing"
  },
  {
    title: "Gladiator",
    description: "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.",
    genre: ["Action", "Adventure", "Drama"],
    languages: ["English"],
    duration: 155,
    releaseDate: "2000-05-05",
    poster: "https://images.unsplash.com/photo-1551806235-a05ff149c402?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&q=80&w=1200",
    rating: 8.5,
    status: "now_playing"
  },
  {
    title: "Interstellar",
    description: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft to find a new planet for humans.",
    genre: ["Adventure", "Drama", "Sci-Fi"],
    languages: ["English"],
    duration: 169,
    releaseDate: "2014-11-07",
    poster: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200",
    rating: 8.7,
    status: "now_playing"
  },
  {
    title: "Oppenheimer",
    description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    genre: ["Biography", "Drama", "History"],
    languages: ["English", "Hindi"],
    duration: 180,
    releaseDate: "2023-07-21",
    poster: "https://images.unsplash.com/photo-1533167649158-6d508895b680?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&q=80&w=1200",
    rating: 8.4,
    status: "now_playing"
  },
  {
    title: "Dune: Part Two",
    description: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    genre: ["Action", "Adventure", "Sci-Fi"],
    languages: ["English", "Spanish"],
    duration: 166,
    releaseDate: "2024-03-01",
    poster: "https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&q=80&w=1200",
    rating: 8.8,
    status: "upcoming"
  },
  {
    title: "Spider-Man: Across the Spider-Verse",
    description: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.",
    genre: ["Animation", "Action", "Adventure"],
    languages: ["English"],
    duration: 140,
    releaseDate: "2023-06-02",
    poster: "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&q=80&w=1200",
    rating: 8.7,
    status: "now_playing"
  },
  {
    title: "The Conjuring",
    description: "Paranormal investigators Ed and Lorraine Warren work to help a family terrorized by a dark presence in their farmhouse.",
    genre: ["Horror", "Thriller"],
    languages: ["English", "Spanish"],
    duration: 112,
    releaseDate: "2013-07-19",
    poster: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1517602302552-47126ce40b88?auto=format&fit=crop&q=80&w=1200",
    rating: 7.5,
    status: "now_playing"
  },
  {
    title: "Superbad",
    description: "Two co-dependent high school seniors are forced to deal with separation anxiety after their plan to stage a booze-soaked party goes awry.",
    genre: ["Comedy"],
    languages: ["English"],
    duration: 113,
    releaseDate: "2007-08-17",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1200",
    rating: 7.6,
    status: "now_playing"
  },
  {
    title: "Dilwale Dulhania Le Jayenge",
    description: "Raj and Simran meet on a trip through Europe and fall in love, but must overcome family traditions to be together.",
    genre: ["Romance", "Drama"],
    languages: ["Hindi"],
    duration: 189,
    releaseDate: "1995-10-20",
    poster: "https://images.unsplash.com/photo-1514525253361-b83a859b2da4?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1200",
    rating: 8.0,
    status: "now_playing"
  },
  {
    title: "Leo",
    description: "A mild-mannered cafe owner becomes a local hero, but his past soon catches up with him in a violent way.",
    genre: ["Action", "Thriller"],
    languages: ["Tamil", "Telugu", "Hindi"],
    duration: 164,
    releaseDate: "2023-10-19",
    poster: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?auto=format&fit=crop&q=80&w=1200",
    rating: 7.2,
    status: "now_playing"
  },
  {
    title: "Amélie",
    description: "Amélie is an innocent and naive girl in Paris who decides to help those around her and, along the way, discovers love.",
    genre: ["Romance", "Comedy"],
    languages: ["French"],
    duration: 122,
    releaseDate: "2001-04-25",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1503149779833-1de50ebe5f8a?auto=format&fit=crop&q=80&w=1200",
    rating: 8.3,
    status: "now_playing"
  },
  {
    title: "Deadpool & Wolverine",
    description: "The ultimate team-up between the merc with a mouth and the clawed mutant in a multiverse-spanning adventure.",
    genre: ["Action", "Comedy", "Sci-Fi"],
    languages: ["English", "Hindi", "Telugu"],
    duration: 127,
    releaseDate: "2024-07-26",
    poster: "https://images.unsplash.com/photo-1534809027769-b00d750a6bac?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=1200",
    rating: 8.2,
    status: "upcoming"
  },
  {
    title: "Finding Nemo",
    description: "After his son is captured in the Great Barrier Reef and taken to Sydney, a timid clownfish sets out on a journey to bring him home.",
    genre: ["Animation", "Adventure", "Comedy"],
    languages: ["English", "Hindi"],
    duration: 100,
    releaseDate: "2003-05-30",
    poster: "https://images.unsplash.com/photo-1551261313-05b634354c2d?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1544551763-47a0159c92b2?auto=format&fit=crop&q=80&w=1200",
    rating: 8.2,
    status: "now_playing"
  },
  {
    title: "The Shining",
    description: "A family heads to an isolated hotel for the winter where a sinister presence influences the father into violence.",
    genre: ["Horror", "Drama"],
    languages: ["English"],
    duration: 146,
    releaseDate: "1980-05-23",
    poster: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=1200",
    rating: 8.4,
    status: "now_playing"
  },
  {
    title: "The Hangover",
    description: "Three buddies wake up from a bachelor party in Las Vegas with no memory of the previous night and the bachelor missing.",
    genre: ["Comedy"],
    languages: ["English"],
    duration: 100,
    releaseDate: "2009-06-05",
    poster: "https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1514320291944-80aa2f7be474?auto=format&fit=crop&q=80&w=1200",
    rating: 7.7,
    status: "now_playing"
  },
  {
    title: "Titanic",
    description: "A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic.",
    genre: ["Romance", "Drama"],
    languages: ["English", "French"],
    duration: 194,
    releaseDate: "1997-12-19",
    poster: "https://images.unsplash.com/photo-1500077423678-25eead48513a?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1436491865332-7a61a109c736?auto=format&fit=crop&q=80&w=1200",
    rating: 7.9,
    status: "now_playing"
  },
  {
    title: "John Wick",
    description: "An ex-hit-man comes out of retirement to track down the gangsters that killed his dog and took everything from him.",
    genre: ["Action", "Thriller"],
    languages: ["English", "Spanish"],
    duration: 101,
    releaseDate: "2014-10-24",
    poster: "https://images.unsplash.com/photo-1485043433441-db091a258e5a?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=1200",
    rating: 7.4,
    status: "now_playing"
  },
  {
    title: "The Silence of the Lambs",
    description: "A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer.",
    genre: ["Thriller", "Crime", "Drama"],
    languages: ["English"],
    duration: 118,
    releaseDate: "1991-02-14",
    poster: "https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1514320291944-80aa2f7be474?auto=format&fit=crop&q=80&w=1200",
    rating: 8.6,
    status: "now_playing"
  },
  {
    title: "Joker: Folie à Deux",
    description: "The highly anticipated sequel following Arthur Fleck as he continues his descent into madness.",
    genre: ["Thriller", "Drama", "Crime"],
    languages: ["English", "Hindi"],
    duration: 138,
    releaseDate: "2024-10-04",
    poster: "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?auto=format&fit=crop&q=80&w=600",
    banner: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1200",
    rating: 8.1,
    status: "upcoming"
  }
];

const theaters = [
  {
    name: "Cineplex Grande",
    address: "Downtown Mall, MG Road",
    city: "Mumbai",
    rows: 10,
    cols: 12,
    facilities: ["Recliner", "Dolby Atmos", "Parking"],
    rating: 4.8,
    location: { type: "Point", coordinates: [72.8231, 18.9248] }
  },
  {
    name: "Galaxy Cinemas",
    address: "Skyline Tower, Andheri West",
    city: "Mumbai",
    rows: 8,
    cols: 10,
    facilities: ["IMAX", "Cafe"],
    rating: 4.5,
    location: { type: "Point", coordinates: [72.8697, 19.1136] }
  },
  {
    name: "Miraj Cinemas",
    address: "PVR Plaza, Connaught Place",
    city: "Delhi",
    rows: 12,
    cols: 14,
    facilities: ["4DX", "Gold Class"],
    rating: 4.7,
    location: { type: "Point", coordinates: [77.2167, 28.6315] }
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cinebook');
    console.log("Connected to MongoDB...");

    // Clear existing
    await Movie.deleteMany({});
    await Theater.deleteMany({});
    await Show.deleteMany({});

    // Add Movies
    const createdMovies = [];
    for (const movieData of movies) {
      try {
        const movie = await Movie.create(movieData);
        createdMovies.push(movie);
      } catch (err) {
        console.error(`Failed to add movie: ${movieData.title}`, err);
      }
    }
    console.log(`Added ${createdMovies.length} Movies`);

    // Add Theaters
    const createdTheaters = await Theater.insertMany(theaters);
    console.log("Added Theaters");

    // Create Shows
    const shows = [];
    const times = ["10:30 AM", "02:00 PM", "06:30 PM", "10:00 PM"];
    
    for (const movie of createdMovies) {
      if (movie.status === 'now_playing') {
        for (const theater of createdTheaters) {
          for (const time of times) {
            // Create seat layout for this show
            const seats = [];
            for (let r = 0; r < theater.rows; r++) {
              for (let c = 0; c < theater.cols; c++) {
                let category = 'silver';
                if (r >= theater.rows - 2) category = 'platinum';
                else if (r >= theater.rows - 5) category = 'gold';
                seats.push({ row: r, col: c, category });
              }
            }

            shows.push({
              movie: movie._id,
              theater: theater._id,
              date: new Date(),
              time,
              languages: movie.languages[0],
              format: theater.name.includes("Galaxy") ? "IMAX" : "2D",
              seats
            });
          }
        }
      }
    }

    await Show.insertMany(shows);
    console.log("Added Shows");

    console.log("Seeding complete! 🎬");
    process.exit();
  } catch (err) {
    console.error("SEED DATABASE ERROR:", JSON.stringify(err, null, 2));
    process.exit(1);
  }
};

seedDB();
