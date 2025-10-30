// Unified hierarchical structure for locations and activities
// This makes it easy to edit and maintain manual context data

export interface ActivityType {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface LocationType {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  activities: ActivityType[]; // Activities available at this location
}

// Default locations with their activities (hierarchical structure)
export const DEFAULT_LOCATIONS: LocationType[] = [
  {
    id: 'home',
    name: 'Home',
    icon: '🏠',
    description: 'At home location',
    activities: [
      { id: 'rest', name: 'Rest', icon: '😴', description: 'Resting or sleeping' },
      { id: 'work', name: 'Work', icon: '💼', description: 'Working activities' },
      { id: 'indoor', name: 'Indoor', icon: '🏠', description: 'General indoor activities' },
      { id: 'cooking', name: 'Cooking', icon: '👨‍🍳', description: 'Cooking or food preparation' },
      { id: 'cleaning', name: 'Cleaning', icon: '🧹', description: 'Household cleaning' },
      { id: 'DIY', name: 'DIY', icon: '🔨', description: 'DIY and home improvement activities' },
      { id: 'studying', name: 'Studying', icon: '📚', description: 'Reading or studying' },
      { id: 'computer_work', name: 'Computer work', icon: '💻', description: 'Working on computer' },
    ]
  },
  {
    id: 'office',
    name: 'Office',
    icon: '🏢',
    description: 'At work/office',
    activities: [
      { id: 'work', name: 'Work', icon: '💼', description: 'Working activities' },
      { id: 'indoor', name: 'Indoor', icon: '🏠', description: 'General indoor activities' },
      { id: 'meeting', name: 'Meeting', icon: '👥', description: 'Business meetings' },
      { id: 'computer_work', name: 'Computer work', icon: '💻', description: 'Working on computer' },
    ]
  },
  {
    id: 'school',
    name: 'School',
    icon: '🏫',
    description: 'At school/university',
    activities: [
      { id: 'indoor', name: 'Indoor', icon: '🏠', description: 'General indoor activities' },
      { id: 'studying', name: 'Studying', icon: '📚', description: 'Reading or studying' },
      { id: 'classroom', name: 'Classroom', icon: '🎓', description: 'Attending classes' },
      { id: 'sport', name: 'Sport', icon: '⚽', description: 'Physical exercise or sports' },
    ]
  },
  {
    id: 'indoor',
    name: 'Indoor',
    icon: '🏢',
    description: 'Indoor air different than work and home',
    activities: [
      { id: 'shopping', name: 'Shopping', icon: '🛒', description: 'Shopping activities' },
      { id: 'Parking', name: 'Parking', icon: '🚗', description: 'Underground parking' },
      { id: 'walking', name: 'Walking', icon: '🚶', description: 'Walking indoors' },
    ]
  },
  {
    id: 'Outdoor',
    name: 'Outdoor',
    icon: '🏙️',
    description: 'Outdoor activities in open air',
    activities: [
      { id: 'walking', name: 'Walking', icon: '🚶', description: 'Walking outdoors' },
      { id: 'cycling', name: 'Cycling', icon: '🚴', description: 'Riding a bicycle' },
      { id: 'outdoor', name: 'Outdoor', icon: '🌤️', description: 'General outdoor activities' },
      { id: 'jogging', name: 'Jogging', icon: '🏃', description: 'Running or jogging' },
      { id: 'sport', name: 'Sport', icon: '⚽', description: 'Physical exercise or sports' },
      { id: 'relaxing', name: 'Relaxing', icon: '🧘', description: 'Relaxing outdoors' },
    ]
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: '🚗',
    description: 'In vehicle or public transport',
    activities: [
      { id: 'transport', name: 'Transport', icon: '🚗', description: 'Using transportation' },
      { id: 'driving', name: 'Driving', icon: '🚗', description: 'Driving a car' },
      { id: 'bus', name: 'Bus', icon: '🚌', description: 'Traveling by bus' },
      { id: 'train', name: 'Train', icon: '🚊', description: 'Traveling by train' },
      { id: 'metro', name: 'Metro', icon: '🚇', description: 'Traveling by metro/subway' },
      { id: 'waiting', name: 'Waiting', icon: '⏳', description: 'Waiting or standing' },
    ]
  },
  {
    id: 'underground',
    name: 'Underground',
    icon: '🚇',
    description: 'Underground transport (metro, subway)',
    activities: [
      { id: 'undergroundTransport', name: 'Underground transport', icon: '🚇', description: 'Metro or subway' },
      { id: 'escalator', name: 'Escalator', icon: '⬆️', description: 'Using escalator in underground transport' },
      { id: 'stairs', name: 'Stairs', icon: '🪜', description: 'Using stairs in underground transport' },
      { id: 'stairsToOutside', name: 'Stairs to outside', icon: '🚪', description: 'Using stairs from underground to surface' },
      { id: 'standPlatform', name: 'Stand platform', icon: '🚉', description: 'Standing on underground platform' },
      { id: 'stand', name: 'Stand', icon: '🧍', description: 'Standing in underground transport' },
    ]
  }
];

// Flattened list of all activities (for backward compatibility and lookups)
export const DEFAULT_ACTIVITIES: ActivityType[] = DEFAULT_LOCATIONS.flatMap(
  location => location.activities
).filter((activity, index, self) => 
  // Remove duplicates by id
  index === self.findIndex(a => a.id === activity.id)
);

// Helper function to get activities available for a specific location
export function getActivitiesForLocation(locationId: string): ActivityType[] {
  const location = DEFAULT_LOCATIONS.find(loc => loc.id === locationId);
  return location?.activities || [];
}

// Helper function to get locations where an activity is available
export function getLocationsForActivity(activityId: string): LocationType[] {
  return DEFAULT_LOCATIONS.filter(location =>
    location.activities.some(activity => activity.id === activityId)
  );
}

// Helper function to check if an activity is allowed at a location
export function isActivityAllowedAtLocation(activityId: string, locationId: string): boolean {
  const location = DEFAULT_LOCATIONS.find(l => l.id === locationId);
  return location ? location.activities.some(a => a.id === activityId) : false;
}

// Get translated names for locations and activities
export function getLocationName(locationId: string, t: (key: string) => string): string {
  const location = DEFAULT_LOCATIONS.find(l => l.id === locationId);
  if (!location) return locationId;
  
  // Try to get translation, fallback to default name
  try {
    return t(`locations.${locationId}`);
  } catch {
    return location.name;
  }
}

export function getActivityName(activityId: string, t: (key: string) => string): string {
  const activity = DEFAULT_ACTIVITIES.find(a => a.id === activityId);
  if (!activity) return activityId;
  
  // Try to get translation, fallback to default name
  try {
    return t(`activities.${activityId}`);
  } catch {
    return activity.name;
  }
}