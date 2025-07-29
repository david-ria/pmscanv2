// Web Worker for speed calculations and heavy computations
// This runs off the main thread to prevent blocking React renders

let locationHistory = [];

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'CALCULATE_SPEED':
      const result = calculateSpeed(data);
      self.postMessage({ type: 'SPEED_RESULT', result });
      break;
      
    case 'CLEAR_HISTORY':
      locationHistory = [];
      self.postMessage({ type: 'HISTORY_CLEARED' });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
};

function calculateSpeed({ latitude, longitude, timestamp }) {
  const currentTime = new Date(timestamp);
  const currentLocation = { lat: latitude, lng: longitude, time: currentTime };
  
  // Add to history
  locationHistory.push(currentLocation);
  
  // Keep only last 10 points for calculations
  if (locationHistory.length > 10) {
    locationHistory = locationHistory.slice(-10);
  }
  
  let speed = 0;
  let isMoving = false;
  
  if (locationHistory.length >= 2) {
    const previous = locationHistory[locationHistory.length - 2];
    const current = locationHistory[locationHistory.length - 1];
    
    // Calculate distance using Haversine formula
    const distance = getDistanceFromLatLonInKm(
      previous.lat, previous.lng,
      current.lat, current.lng
    );
    
    // Calculate time difference in hours
    const timeDiff = (current.time - previous.time) / (1000 * 60 * 60);
    
    if (timeDiff > 0) {
      speed = distance / timeDiff; // km/h
      isMoving = speed > 1; // Consider moving if speed > 1 km/h
    }
  }
  
  return { speed, isMoving };
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}
