'use client';
import Link from 'next/link';
import styles from './MovieCard.module.css';

interface Movie {
  _id: string;
  title: string;
  poster: string;
  genre: string[];
  duration: number;
  rating: number;
  status: string;
  languages: string[];
}

export default function MovieCard({ movie }: { movie: Movie }) {
  const hrs = Math.floor(movie.duration / 60);
  const mins = movie.duration % 60;

  return (
    <Link href={`/movies/${movie._id}`} className={styles.card}>
      <div className={styles.posterWrapper}>
        <img src={movie.poster} alt={movie.title} className={styles.poster} />
        <div className={styles.overlay}>
          <button className={styles.bookBtn}>Book Tickets</button>
        </div>
        <div className={styles.rating}>
          <span>⭐</span> {movie.rating.toFixed(1)}
        </div>
        <div className={`${styles.statusBadge} ${movie.status === 'now_playing' ? styles.nowPlaying : styles.upcoming}`}>
          {movie.status === 'now_playing' ? '● Now Playing' : '◎ Upcoming'}
        </div>
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>{movie.title}</h3>
        <div className={styles.meta}>
          <span className={styles.genre}>{movie.genre.slice(0, 2).join(' · ')}</span>
          <span className={styles.duration}>⏱ {hrs > 0 ? `${hrs}h ` : ''}{mins}m</span>
        </div>
        <div className={styles.languages}>
          {movie.languages.slice(0, 3).map(lang => (
            <span key={lang} className={styles.langTag}>{lang}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
