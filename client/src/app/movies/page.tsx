'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocation } from '@/context/LocationContext';
import Navbar from '@/components/layout/Navbar';
import MovieCard from '@/components/movies/MovieCard';
import { getMovies } from '@/lib/api';
import styles from './movies.module.css';

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller', 'Animation', 'Romance'];
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Spanish', 'French'];

interface Movie {
  _id: string;
  title: string;
  genre: string[];
  languages: string[];
  poster: string;
  rating: number;
  duration: number;
  status: string;
}

export default function MoviesPage() {
  const searchParams = useSearchParams();
  const { city } = useLocation();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    genre: searchParams.get('genre') || '',
    language: searchParams.get('language') || '',
    search: searchParams.get('search') || '',
    sortBy: 'newest',
  });

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const query: any = {};
        if (filters.status) query.status = filters.status;
        if (filters.genre) query.genre = filters.genre;
        if (filters.language) query.languages = filters.language;
        if (filters.search) query.search = filters.search;
        if (filters.sortBy) query.sortBy = filters.sortBy;
        if (city) query.city = city;
        
        const res = await getMovies(query);
        setMovies(res.data.movies);
      } catch (err) {
        console.error('Failed to fetch movies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [filters, city]);

  const toggleFilter = (type: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type as keyof typeof prev] === value ? '' : value
    }));
  };

  return (
    <main className={styles.container}>
      <Navbar />
      
      <div className="section">
        <div className="container">
          <header className={styles.header}>
            <div className="flex-between">
              <div>
                <h1 className="section-title">Explore Movies</h1>
                <p className="section-subtitle">Find your next cinematic experience</p>
              </div>
              <div className={styles.sortWrapper}>
                <span>Sort by:</span>
                <select 
                  className={styles.sortSelect}
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                >
                  <option value="newest">Newest Releases</option>
                  <option value="rating">Highest Rated</option>
                  <option value="title">A - Z (Title)</option>
                  <option value="oldest">Classic (Oldest)</option>
                </select>
              </div>
            </div>
          </header>

          <div className={styles.layout}>
            {/* Sidebar Filters */}
            <aside className={styles.sidebar}>
              <div className={styles.filterGroup}>
                <h3 className={styles.filterTitle}>Status</h3>
                <div className={styles.filterOptions}>
                  <button 
                    className={`${styles.filterBtn} ${filters.status === 'now_playing' ? styles.active : ''}`}
                    onClick={() => toggleFilter('status', 'now_playing')}
                  >
                    Now Playing
                  </button>
                  <button 
                    className={`${styles.filterBtn} ${filters.status === 'upcoming' ? styles.active : ''}`}
                    onClick={() => toggleFilter('status', 'upcoming')}
                  >
                    Upcoming
                  </button>
                </div>
              </div>

              <div className={styles.filterGroup}>
                <h3 className={styles.filterTitle}>Genres</h3>
                <div className={styles.filterOptions}>
                  {GENRES.map(genre => (
                    <button 
                      key={genre}
                      className={`${styles.filterBtn} ${filters.genre === genre ? styles.active : ''}`}
                      onClick={() => toggleFilter('genre', genre)}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <h3 className={styles.filterTitle}>Languages</h3>
                <div className={styles.filterOptions}>
                  {LANGUAGES.map(lang => (
                    <button 
                      key={lang}
                      className={`${styles.filterBtn} ${filters.language === lang ? styles.active : ''}`}
                      onClick={() => toggleFilter('language', lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                className={styles.resetBtn}
                onClick={() => setFilters({ status: '', genre: '', language: '', search: '', sortBy: 'newest' })}
              >
                Reset All Filters
              </button>
            </aside>

            {/* Movie Grid */}
            <div className={styles.content}>
              {filters.search && (
                <div className={styles.searchTerm}>
                  Showing results for: <strong>"{filters.search}"</strong>
                  <button onClick={() => setFilters(prev => ({...prev, search: ''}))}>✕</button>
                </div>
              )}

              <div className={styles.movieGrid}>
                {loading ? (
                  Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{aspectRatio: '2/3', borderRadius: '12px'}} />)
                ) : movies.length > 0 ? (
                  movies.map(movie => <MovieCard key={movie._id} movie={movie} />)
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🎬</div>
                    <h3>No movies found</h3>
                    <p>Try adjusting your search or filters to find what you're looking for.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
