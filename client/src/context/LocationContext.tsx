'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface LocationContextType {
  city: string;
  setCity: (city: string) => void;
  availableCities: string[];          // fixed + any detected cities
  detectLocation: () => Promise<{ success: boolean; city?: string; error?: string }>;
  detecting: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Fixed cities always shown in the list
const BASE_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata',
  'Nagpur', 'Nashik', 'Aurangabad', 'Nanded', 'Solapur', 'Amravati',
  'Jaipur', 'Surat', 'Ahmedabad', 'Vadodara', 'Indore', 'Bhopal',
  'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Patna', 'Ranchi',
  'Bhubaneswar', 'Visakhapatnam', 'Vijayawada', 'Coimbatore', 'Madurai',
  'Kochi', 'Thiruvananthapuram', 'Mangaluru', 'Mysuru',
  'Chandigarh', 'Ludhiana', 'Amritsar', 'Dehradun', 'Guwahati',
];

// Approximate coordinates for nearest-city fallback
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'Mumbai': { lat: 19.0760, lon: 72.8777 }, 'Delhi': { lat: 28.6139, lon: 77.2090 },
  'Bengaluru': { lat: 12.9716, lon: 77.5946 }, 'Pune': { lat: 18.5204, lon: 73.8567 },
  'Hyderabad': { lat: 17.3850, lon: 78.4867 }, 'Chennai': { lat: 13.0827, lon: 80.2707 },
  'Kolkata': { lat: 22.5726, lon: 88.3639 }, 'Nagpur': { lat: 21.1458, lon: 79.0882 },
  'Nashik': { lat: 19.9975, lon: 73.7898 }, 'Aurangabad': { lat: 19.8762, lon: 75.3433 },
  'Nanded': { lat: 18.9068, lon: 77.2967 }, 'Solapur': { lat: 17.6599, lon: 75.9064 },
  'Jaipur': { lat: 26.9124, lon: 75.7873 }, 'Ahmedabad': { lat: 23.0225, lon: 72.5714 },
  'Surat': { lat: 21.1702, lon: 72.8311 }, 'Indore': { lat: 22.7196, lon: 75.8577 },
  'Lucknow': { lat: 26.8467, lon: 80.9462 }, 'Visakhapatnam': { lat: 17.6868, lon: 83.2185 },
  'Kochi': { lat: 9.9312, lon: 76.2673 }, 'Chandigarh': { lat: 30.7333, lon: 76.7794 },
};

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const findNearestCity = (lat: number, lon: number): string => {
  let nearest = BASE_CITIES[0];
  let minDist = Infinity;
  for (const city of Object.keys(CITY_COORDS)) {
    const c = CITY_COORDS[city];
    const d = distanceKm(lat, lon, c.lat, c.lon);
    if (d < minDist) { minDist = d; nearest = city; }
  }
  return nearest;
};

const CITY_ALIASES: Record<string, string> = {
  'new delhi': 'Delhi', 'delhi': 'Delhi',
  'mumbai': 'Mumbai', 'bombay': 'Mumbai',
  'bangalore': 'Bengaluru', 'bengaluru': 'Bengaluru', 'bengalore': 'Bengaluru',
  'pune': 'Pune', 'hyderabad': 'Hyderabad',
  'chennai': 'Chennai', 'madras': 'Chennai',
  'kolkata': 'Kolkata', 'calcutta': 'Kolkata',
  'nagpur': 'Nagpur', 'nashik': 'Nashik',
  'aurangabad': 'Aurangabad', 'nanded': 'Nanded',
  'solapur': 'Solapur', 'jaipur': 'Jaipur',
  'ahmedabad': 'Ahmedabad', 'surat': 'Surat',
  'indore': 'Indore', 'lucknow': 'Lucknow',
  'visakhapatnam': 'Visakhapatnam', 'vizag': 'Visakhapatnam',
  'kochi': 'Kochi', 'cochin': 'Kochi',
  'chandigarh': 'Chandigarh',
};

const normalizeCity = (raw: string): string => {
  const lower = raw.toLowerCase().trim();
  if (CITY_ALIASES[lower]) return CITY_ALIASES[lower];
  for (const [alias, mapped] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias)) return mapped;
  }
  // Capitalize first letter of each word for unknown cities
  return raw.trim().replace(/\b\w/g, c => c.toUpperCase());
};

// Call backend to provision theaters+shows for a new city
const provisionCity = async (city: string) => {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    await fetch(`${API}/theaters/ensure-city`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city }),
    });
  } catch { /* non-critical */ }
};

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [city, setCityState] = useState<string>('');
  const [detecting, setDetecting] = useState(false);
  // Extra cities detected at runtime (not in BASE_CITIES)
  const [extraCities, setExtraCities] = useState<string[]>([]);

  useEffect(() => {
    const savedCity = localStorage.getItem('cinebook_city');
    if (savedCity) {
      setCityState(savedCity);
      // If saved city is not in base list, add it to extra
      if (!BASE_CITIES.includes(savedCity)) {
        setExtraCities([savedCity]);
      }
    }
    const savedExtra = localStorage.getItem('cinebook_extra_cities');
    if (savedExtra) {
      try { setExtraCities(JSON.parse(savedExtra)); } catch { /* ignore */ }
    }
  }, []);

  const setCity = (newCity: string) => {
    setCityState(newCity);
    localStorage.setItem('cinebook_city', newCity);
    // Only provision and track extra cities that aren't in the base list
    if (!BASE_CITIES.includes(newCity)) {
      setExtraCities(prev => {
        const updated = prev.includes(newCity) ? prev : [...prev, newCity];
        localStorage.setItem('cinebook_extra_cities', JSON.stringify(updated));
        return updated;
      });
      provisionCity(newCity);
    }
  };

  const detectLocation = async (): Promise<{ success: boolean; city?: string; error?: string }> => {
    setDetecting(true);
    try {
      // ── Primary: GPS ──────────────────────────────────────────────────────
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              pos => resolve(pos.coords),
              err => reject(err),
              { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
            );
          });

          const { latitude: lat, longitude: lon } = coords;
          let detectedCity: string | null = null;

          // Reverse geocode via Nominatim
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const geoData = await geoRes.json();
            const candidates = [
              geoData.address?.city, geoData.address?.town,
              geoData.address?.village, geoData.address?.county,
              geoData.address?.state_district,
            ].filter(Boolean);

            if (candidates.length > 0) {
              detectedCity = normalizeCity(candidates[0]);
            }
          } catch { /* Nominatim failed */ }

          // If Nominatim failed, use nearest known city
          if (!detectedCity) {
            detectedCity = findNearestCity(lat, lon);
          }

          setCity(detectedCity);
          setDetecting(false);
          return { success: true, city: detectedCity };

        } catch (gpsErr: any) {
          if (gpsErr?.code === 1) {
            setDetecting(false);
            return {
              success: false,
              error: 'Location permission denied. Please allow location access and try again, or select your city manually.',
            };
          }
          // GPS timeout/unavailable — fall through to IP
        }
      }

      // ── Fallback: IP-based ─────────────────────────────────────────────────
      try {
        const ipRes = await fetch('http://ip-api.com/json?fields=status,city,regionName,lat,lon', {
          signal: AbortSignal.timeout(6000),
        });
        const ipData = await ipRes.json();
        if (ipData.status === 'success') {
          let detectedCity = normalizeCity(ipData.city || ipData.regionName || '');
          if (!detectedCity && ipData.lat && ipData.lon) {
            detectedCity = findNearestCity(ipData.lat, ipData.lon);
          }
          if (detectedCity) {
            setCity(detectedCity);
            setDetecting(false);
            return { success: true, city: detectedCity };
          }
        }
      } catch { /* IP API failed */ }

      setDetecting(false);
      return { success: false, error: 'Could not detect your location. Please select your city manually.' };
    } catch {
      setDetecting(false);
      return { success: false, error: 'Could not detect location. Please select your city manually.' };
    }
  };

  // Merge base + extra, deduplicated
  const availableCities = [...new Set([...BASE_CITIES, ...extraCities])];

  return (
    <LocationContext.Provider value={{ city, setCity, availableCities, detectLocation, detecting }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within LocationProvider');
  return context;
};
