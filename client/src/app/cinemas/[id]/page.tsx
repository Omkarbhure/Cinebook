'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import axios from 'axios';
import Link from 'next/link';
import styles from './details.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Show {
  _id: string;
  time: string;
  format: string;
  language: string;
  movie: {
    _id: string;
    title: string;
    poster: string;
    genre: string[];
    duration: number;
    rating: number;
  };
}

export default function TheaterDetails() {
  const { id } = useParams();
  const [theater, setTheater] = useState<any>(null);
  const [groupedShows, setGroupedShows] = useState<Record<string, Show[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [theaterRes, showsRes] = await Promise.all([
          axios.get(`${API}/theaters/details/${id}`),
          axios.get(`${API}/shows/theater/${id}`)
        ]);
        
        setTheater(theaterRes.data.data);
        
        // Group shows by movie title
        const grouped = showsRes.data.shows.reduce((acc: any, show: Show) => {
          const key = show.movie.title;
          if (!acc[key]) acc[key] = [];
          acc[key].push(show);
          return acc;
        }, {});
        
        setGroupedShows(grouped);
      } catch (err) {
        console.error('Error fetching theater details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="flex-center" style={{height:'100vh'}}><div className="spinner" /></div>;

  if (!theater) return <div className="flex-center" style={{height:'100vh'}}>Theater not found</div>;

  return (
    <main className={styles.container}>
      <Navbar />
      
      <div className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1>{theater.name}</h1>
            <p className={styles.address}>{theater.address}</p>
            <div className={styles.meta}>
              <span className={styles.rating}>⭐ {theater.rating}</span>
              <span className={styles.facilities}>{theater.facilities?.join(' · ')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <h2 className={styles.sectionTitle}>Now Playing</h2>
          <div className={styles.movieList}>
            {Object.keys(groupedShows).length > 0 ? (
              Object.entries(groupedShows).map(([movieTitle, shows]) => (
                <div key={movieTitle} className={styles.movieRow}>
                  <div className={styles.moviePoster}>
                    <img 
                      src={shows[0].movie.poster || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=300'} 
                      alt={movieTitle} 
                    />
                  </div>
                  <div className={styles.movieInfo}>
                    <div className={styles.movieHeader}>
                      <h3>{movieTitle}</h3>
                      <div className={styles.movieMeta}>
                        <span>{shows[0].movie.duration} mins</span>
                        <span>{shows[0].movie.genre.join(', ')}</span>
                      </div>
                    </div>
                    
                    <div className={styles.showtimes}>
                      {shows.map(show => (
                        <Link key={show._id} href={`/booking/${show._id}`} className={styles.timeSlot}>
                          <span className={styles.time}>{show.time}</span>
                          <span className={styles.format}>{show.format}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyShows}>
                <p>No shows found for this theater today. Please check back later!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
