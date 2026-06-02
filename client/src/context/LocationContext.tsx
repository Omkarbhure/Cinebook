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
  'Amravati': { lat: 20.9320, lon: 77.7523 },
  'Jaipur': { lat: 26.9124, lon: 75.7873 }, 'Ahmedabad': { lat: 23.0225, lon: 72.5714 },
  'Surat': { lat: 21.1702, lon: 72.8311 }, 'Indore': { lat: 22.7196, lon: 75.8577 },
  'Bhopal': { lat: 23.2599, lon: 77.4126 },
  'Lucknow': { lat: 26.8467, lon: 80.9462 }, 'Kanpur': { lat: 26.4499, lon: 80.3319 },
  'Agra': { lat: 27.1767, lon: 78.0081 }, 'Varanasi': { lat: 25.3176, lon: 82.9739 },
  'Patna': { lat: 25.5941, lon: 85.1376 }, 'Ranchi': { lat: 23.3441, lon: 85.3096 },
  'Visakhapatnam': { lat: 17.6868, lon: 83.2185 }, 'Vijayawada': { lat: 16.5062, lon: 80.6480 },
  'Kochi': { lat: 9.9312, lon: 76.2673 }, 'Thiruvananthapuram': { lat: 8.5241, lon: 76.9366 },
  'Coimbatore': { lat: 11.0168, lon: 76.9558 }, 'Madurai': { lat: 9.9252, lon: 78.1198 },
  'Chandigarh': { lat: 30.7333, lon: 76.7794 }, 'Ludhiana': { lat: 30.9010, lon: 75.8573 },
  'Amritsar': { lat: 31.6340, lon: 74.8723 }, 'Dehradun': { lat: 30.3165, lon: 78.0322 },
  'Guwahati': { lat: 26.1445, lon: 91.7362 }, 'Bhubaneswar': { lat: 20.2961, lon: 85.8245 },
  'Mysuru': { lat: 12.2958, lon: 76.6394 }, 'Mangaluru': { lat: 12.9141, lon: 74.8560 },
  'Vadodara': { lat: 22.3072, lon: 73.1812 },
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
  // Delhi variants
  'new delhi': 'Delhi', 'delhi': 'Delhi', 'south delhi': 'Delhi', 'north delhi': 'Delhi',
  'east delhi': 'Delhi', 'west delhi': 'Delhi', 'central delhi': 'Delhi',
  // Mumbai variants
  'mumbai': 'Mumbai', 'bombay': 'Mumbai', 'greater mumbai': 'Mumbai',
  'andheri': 'Mumbai', 'bandra': 'Mumbai', 'kurla': 'Mumbai', 'thane': 'Mumbai',
  'borivali': 'Mumbai', 'dadar': 'Mumbai', 'malad': 'Mumbai', 'goregaon': 'Mumbai',
  'powai': 'Mumbai', 'mulund': 'Mumbai', 'versova': 'Mumbai', 'worli': 'Mumbai',
  // Bengaluru variants
  'bangalore': 'Bengaluru', 'bengaluru': 'Bengaluru', 'bengalore': 'Bengaluru',
  'bengaluru urban': 'Bengaluru', 'bruhat bengaluru': 'Bengaluru',
  // Pune variants
  'pune': 'Pune', 'pimpri': 'Pune', 'chinchwad': 'Pune', 'pimpri-chinchwad': 'Pune',
  'hadapsar': 'Pune', 'kothrud': 'Pune', 'shivajinagar': 'Pune', 'wakad': 'Pune',
  // Hyderabad variants
  'hyderabad': 'Hyderabad', 'secunderabad': 'Hyderabad', 'cyberabad': 'Hyderabad',
  'rangareddy': 'Hyderabad', 'medchal': 'Hyderabad',
  // Chennai variants
  'chennai': 'Chennai', 'madras': 'Chennai', 'tambaram': 'Chennai', 'velachery': 'Chennai',
  // Kolkata variants
  'kolkata': 'Kolkata', 'calcutta': 'Kolkata', 'howrah': 'Kolkata', 'salt lake': 'Kolkata',
  // Other cities
  'nagpur': 'Nagpur', 'nashik': 'Nashik', 'aurangabad': 'Aurangabad', 'nanded': 'Nanded',
  'solapur': 'Solapur', 'jaipur': 'Jaipur', 'ahmedabad': 'Ahmedabad', 'surat': 'Surat',
  'indore': 'Indore', 'lucknow': 'Lucknow', 'visakhapatnam': 'Visakhapatnam',
  'vizag': 'Visakhapatnam', 'kochi': 'Kochi', 'cochin': 'Kochi', 'ernakulam': 'Kochi',
  'chandigarh': 'Chandigarh', 'coimbatore': 'Coimbatore', 'madurai': 'Madurai',
  'vadodara': 'Vadodara', 'baroda': 'Vadodara', 'bhopal': 'Bhopal', 'patna': 'Patna',
  'ranchi': 'Ranchi', 'mysuru': 'Mysuru', 'mysore': 'Mysuru', 'mangaluru': 'Mangaluru',
  'mangalore': 'Mangaluru', 'guwahati': 'Guwahati', 'dehradun': 'Dehradun',
  'amritsar': 'Amritsar', 'ludhiana': 'Ludhiana', 'agra': 'Agra', 'varanasi': 'Varanasi',
  'kanpur': 'Kanpur', 'vijayawada': 'Vijayawada', 'bhubaneswar': 'Bhubaneswar',
  'thiruvananthapuram': 'Thiruvananthapuram', 'trivandrum': 'Thiruvananthapuram',
  'amravati': 'Amravati',
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
      // Provision on load too — ensures shows exist if they were cleared
      provisionCity(savedCity);
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
    // Provision theaters+shows for this city (ensureCity is idempotent — safe to call every time)
    provisionCity(newCity);
    // Track extra cities not in base list
    if (!BASE_CITIES.includes(newCity)) {
      setExtraCities(prev => {
        const updated = prev.includes(newCity) ? prev : [...prev, newCity];
        localStorage.setItem('cinebook_extra_cities', JSON.stringify(updated));
        return updated;
      });
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
              { timeout: 15000, maximumAge: 0, enableHighAccuracy: true }
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

            // Try each address field in order — city is most accurate, fall to state_district
            const candidates = [
              geoData.address?.city,
              geoData.address?.town,
              geoData.address?.municipality,
              geoData.address?.county,
              geoData.address?.state_district,
            ].filter(Boolean);

            // Find the first candidate that matches a known city (after normalization)
            for (const candidate of candidates) {
              const normalized = normalizeCity(candidate);
              if (BASE_CITIES.includes(normalized)) {
                detectedCity = normalized;
                break;
              }
            }

            // If no direct match, try normalizing and see if any alias works
            if (!detectedCity && candidates.length > 0) {
              const normalized = normalizeCity(candidates[0]);
              if (normalized) detectedCity = normalized;
            }
          } catch { /* Nominatim failed */ }

          // Always use nearest known city as final fallback using actual GPS coords
          // This ensures we always return a city from BASE_CITIES
          if (!detectedCity || !BASE_CITIES.includes(detectedCity)) {
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
        const ipRes = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(6000),
        });
        const ipData = await ipRes.json();
        if (ipData && ipData.city) {
          let detectedCity = normalizeCity(ipData.city || ipData.region || '');
          if (!detectedCity && ipData.latitude && ipData.longitude) {
            detectedCity = findNearestCity(ipData.latitude, ipData.longitude);
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
