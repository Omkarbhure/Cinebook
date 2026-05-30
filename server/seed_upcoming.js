require('dotenv').config();
const mongoose = require('mongoose');

const upcoming = [
  {
    title: 'Avatar: Fire and Ash',
    description: 'The Sully family faces a new threat as they explore the volcanic regions of Pandora.',
    genre: ['Action', 'Adventure', 'Sci-Fi'],
    languages: ['English', 'Hindi'],
    duration: 162,
    releaseDate: '2025-12-19',
    poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=600',
    banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
    rating: 8.1,
    status: 'upcoming',
  },
  {
    title: 'Mission: Impossible 8',
    description: 'Ethan Hunt faces his most dangerous mission yet as he races against time to prevent a global catastrophe.',
    genre: ['Action', 'Thriller'],
    languages: ['English', 'Hindi'],
    duration: 145,
    releaseDate: '2025-05-23',
    poster: 'https://images.unsplash.com/photo-1485043433441-db091a258e5a?auto=format&fit=crop&q=80&w=600',
    banner: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=1200',
    rating: 8.3,
    status: 'upcoming',
  },
  {
    title: 'Fantastic Four',
    description: 'Marvel\'s first family makes their MCU debut as they face a cosmic threat that could destroy the universe.',
    genre: ['Action', 'Adventure', 'Sci-Fi'],
    languages: ['English', 'Hindi', 'Tamil'],
    duration: 130,
    releaseDate: '2025-07-25',
    poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=600',
    banner: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&q=80&w=1200',
    rating: 7.9,
    status: 'upcoming',
  },
  {
    title: 'Jurassic World: Rebirth',
    description: 'A new chapter in the Jurassic saga as scientists discover a hidden island teeming with prehistoric life.',
    genre: ['Action', 'Adventure', 'Sci-Fi'],
    languages: ['English', 'Hindi'],
    duration: 138,
    releaseDate: '2025-07-02',
    poster: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=600',
    banner: 'https://images.unsplash.com/photo-1517602302552-47126ce40b88?auto=format&fit=crop&q=80&w=1200',
    rating: 7.5,
    status: 'upcoming',
  },
  {
    title: 'Thunderbolts',
    description: 'A team of Marvel antiheroes is assembled for a dangerous black-ops mission.',
    genre: ['Action', 'Comedy'],
    languages: ['English', 'Hindi'],
    duration: 127,
    releaseDate: '2025-05-02',
    poster: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?auto=format&fit=crop&q=80&w=600',
    banner: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1200',
    rating: 7.8,
    status: 'upcoming',
  },
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Movie = require('./src/models/Movie');
  // Remove old upcoming movies first
  await Movie.deleteMany({ status: 'upcoming' });
  const created = await Movie.insertMany(upcoming);
  console.log(`✅ Seeded ${created.length} upcoming movies`);
  mongoose.disconnect();
});
