const axios = require('axios');

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

exports.fetchRealCinemas = async (city) => {
  // 💡 Check if API Key is configured. If not, fallback to high-quality localized mocks.
  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY.startsWith('your_')) {
    console.log(`[DEMO MODE] Faking real cinemas for: ${city}`);
    return [
      { 
        name: `PVR Cinemas - ${city} Grand`, 
        address: `Level 3, ${city} Central Mall, MG Road`, 
        rating: 4.7, 
        placeId: `mock_${city.toLowerCase()}_1`,
        location: { lat: 19.0760, lng: 72.8777 } // Default Mumbai coords if key missing
      },
      { 
        name: `INOX Multiples - ${city}`, 
        address: `Plaza Tower, ${city} East`, 
        rating: 4.2, 
        placeId: `mock_${city.toLowerCase()}_2`,
        location: { lat: 19.1136, lng: 72.8697 }
      },
      { 
        name: `Miraj Cinemas - ${city} Heights`, 
        address: `Avenue Road, ${city}`, 
        rating: 4.5, 
        placeId: `mock_${city.toLowerCase()}_3`,
        location: { lat: 18.9248, lng: 72.8231 }
      }
    ];
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=cinema+in+${city}&key=${GOOGLE_PLACES_API_KEY}`;
    const res = await axios.get(url);
    
    return res.data.results.slice(0, 10).map(place => ({
      name: place.name,
      address: place.formatted_address,
      rating: place.rating || 4.0,
      placeId: place.place_id,
      location: place.geometry.location // { lat, lng }
    }));
  } catch (err) {
    console.error('Google Places API Error:', err.message);
    throw new Error('Failed to fetch real-world cinemas from Google.');
  }
};
