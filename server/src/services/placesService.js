const axios = require('axios');

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Approximate city coordinates for mock mode
const CITY_COORDS = {
  mumbai: { lat: 19.0760, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  pune: { lat: 18.5204, lng: 73.8567 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  nanded: { lat: 18.9068, lng: 77.2967 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  surat: { lat: 21.1702, lng: 72.8311 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
};

const getCityCoords = (city) => {
  const key = city.toLowerCase().trim();
  return CITY_COORDS[key] || { lat: 20.5937, lng: 78.9629 }; // India center as fallback
};

exports.fetchRealCinemas = async (city) => {
  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY.startsWith('your_')) {
    console.log(`[DEMO MODE] Faking real cinemas for: ${city}`);
    const coords = getCityCoords(city);
    // Slightly offset each theater so they appear at different locations
    return [
      {
        name: `PVR Cinemas - ${city} Grand`,
        address: `Level 3, ${city} Central Mall, MG Road, ${city}`,
        rating: 4.7,
        placeId: `mock_${city.toLowerCase()}_1`,
        location: { lat: coords.lat + 0.01, lng: coords.lng + 0.01 },
      },
      {
        name: `INOX Multiplex - ${city}`,
        address: `Plaza Tower, ${city} East, ${city}`,
        rating: 4.2,
        placeId: `mock_${city.toLowerCase()}_2`,
        location: { lat: coords.lat - 0.01, lng: coords.lng + 0.02 },
      },
      {
        name: `Miraj Cinemas - ${city} Heights`,
        address: `Avenue Road, ${city}`,
        rating: 4.5,
        placeId: `mock_${city.toLowerCase()}_3`,
        location: { lat: coords.lat + 0.02, lng: coords.lng - 0.01 },
      },
    ];
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=cinema+in+${encodeURIComponent(city)}&key=${GOOGLE_PLACES_API_KEY}`;
    const res = await axios.get(url);
    return res.data.results.slice(0, 10).map(place => ({
      name: place.name,
      address: place.formatted_address,
      rating: place.rating || 4.0,
      placeId: place.place_id,
      location: place.geometry.location,
    }));
  } catch (err) {
    console.error('Google Places API Error:', err.message);
    throw new Error('Failed to fetch real-world cinemas from Google.');
  }
};
