'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocation } from '@/context/LocationContext';
import Navbar from '@/components/layout/Navbar';
import MovieCard from '@/components/movies/MovieCard';
import { getMovies } from '@/lib/api';
import styles from './page.module.css';

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

export default function Home() {
  const { city } = useLocation();
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const [nowRes, upcomingRes] = await Promise.all([
          getMovies({ status: 'now_playing', limit: '8', ...(city ? { city } : {}) }),
          getMovies({ status: 'upcoming', limit: '8' })
        ]);
        setNowPlaying(nowRes.data.movies);
        setUpcoming(upcomingRes.data.movies);
      } catch (err) {
        console.error('Failed to fetch movies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [city]);

  return (
    <main className={styles.main}>
      <Navbar />
      
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay}>
          <div className="container">
            <div className={styles.heroContent}>
              <span className={styles.heroBadge}>Exclusive Early Access</span>
              <h1 className={styles.heroTitle}>Experience Cinema <br /> Like Never Before</h1>
              <p className={styles.heroSubtitle}>
                Book tickets for the latest blockbusters and get instant confirmation. 
                Experience the magic of the big screen with premium comfort and technology.
              </p>
              <div className={styles.heroBtns}>
                <Link href="/movies" className="btn btn-primary btn-lg">Browse All Movies</Link>
                <Link href="/auth/register" className="btn btn-secondary btn-lg">Join CineBook</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="section">
        <div className="container">
          <div className="flex-between">
            <div>
              <h2 className="section-title">Now Playing</h2>
              <p className="section-subtitle">Catch the latest hits in theaters now</p>
            </div>
            <Link href="/movies?status=now_playing" className={styles.viewAll}>View All →</Link>
          </div>
          
          <div className={styles.movieGrid}>
            {loading ? (
              Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{aspectRatio: '2/3', borderRadius: '12px'}} />)
            ) : nowPlaying.length > 0 ? (
              nowPlaying.map(movie => <MovieCard key={movie._id} movie={movie} />)
            ) : (
              <p className={styles.noMovies}>No movies found currently playing.</p>
            )}
          </div>
        </div>
      </section>

      {/* Upcoming Section */}
      <section className={`${styles.upcomingSection} section-sm`}>
        <div className="container">
          <div className="flex-between">
            <div>
              <h2 className="section-title">Coming Soon</h2>
              <p className="section-subtitle">Mark your calendars for these upcoming releases</p>
            </div>
            <Link href="/movies?status=upcoming" className={styles.viewAll}>View All →</Link>
          </div>
          
          <div className={styles.movieGrid}>
            {loading ? (
              Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{aspectRatio: '2/3', borderRadius: '12px'}} />)
            ) : upcoming.length > 0 ? (
              upcoming.map(movie => <MovieCard key={movie._id} movie={movie} />)
            ) : (
              <p className={styles.noMovies}>Stay tuned for new releases!</p>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className="container">
          <div className={styles.ctaCard}>
            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>Ready for the show?</h2>
              <p className={styles.ctaSubtitle}>Sign up today and get 20% off on your first booking!</p>
              <Link href="/auth/register" className="btn btn-primary">Get Started Now</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <span className={styles.footerLogo}>🎬 CineBook</span>
              <p className={styles.footerDesc}>The smartest way to book your cinema tickets online. Enjoy premium benefits and exclusive rewards.</p>
            </div>
            <div className={styles.footerGroups}>
              <div className={styles.footerGroup}>
                <h4>Company</h4>
                <Link href="#">About Us</Link>
                <Link href="#">Contact Us</Link>
                <Link href="#">Terms & Conditions</Link>
              </div>
              <div className={styles.footerGroup}>
                <h4>Help</h4>
                <Link href="#">FAQs</Link>
                <Link href="#">Privacy Policy</Link>
                <Link href="#">Refund Policy</Link>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>&copy; {new Date().getFullYear()} CineBook. All rights reserved.</p>
            <div className={styles.socials}>
              <Link href="#">Instagram</Link>
              <Link href="#">Twitter</Link>
              <Link href="#">Facebook</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
