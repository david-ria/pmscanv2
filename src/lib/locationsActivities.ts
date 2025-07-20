// Combined locations and activities management with location-dependent activities

export interface LocationType {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  allowedActivities: string[]; // Activity IDs that are allowed for this location
}

export interface ActivityType {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  availableAt: string[]; // Location IDs where this activity is available
}

// Default location types
export const DEFAULT_LOCATIONS: LocationType[] = [
  {
    id: 'home',
    name: 'Home',
    icon: '🏠',
    description: 'At home location',
    allowedActivities: ['rest', 'work', 'indoor', 'cooking', 'cleaning', 'DIY']
  },
  {
    id: 'office',
    name: 'Office',
    icon: '🏢',
    description: 'At work/office',
    allowedActivities: ['work', 'indoor', 'meeting', 'computer_work']
  },
  {
    id: 'school',
    name: 'School',
    icon: '🏫',
    description: 'At school/university',
    allowedActivities: ['indoor', 'studying', 'classroom', 'sport']
  },
  {
    id: 'indoor',
    name: 'Indoor',
    icon: '🌳',
    description: 'Indoor air different than work and home',
    allowedActivities: ['shopping', 'parking', 'underground', 'outdoor', 'jogging', 'relaxing']
  },
  {
    id: 'Outdoor',
    name: 'Outdoor',
    icon: '🏙️',
    description: 'Outdoor activities in open air',
    allowedActivities: ['walking', 'cycling', 'outdoor', 'jogging']
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: '🚗',
    description: 'In vehicle or public transport',
    allowedActivities: ['transport', 'driving', 'bus', 'train', 'metro', 'undergroundTransport']
  }
];

// Default activity types
export const DEFAULT_ACTIVITIES: ActivityType[] = [
  {
    id: 'walking',
    name: 'Walking',
    icon: '🚶',
    description: 'Walking outdoors',
    availableAt: ['park', 'mainStreet', 'school']
  },
  {
    id: 'cycling',
    name: 'Cycling',
    icon: '🚴',
    description: 'Riding a bicycle',
    availableAt: ['park', 'mainStreet']
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: '🚗',
    description: 'Using transportation',
    availableAt: ['transport']
  },
  {
    id: 'driving',
    name: 'Driving',
    icon: '🚗',
    description: 'Driving a car',
    availableAt: ['transport']
  },
  {
    id: 'sport',
    name: 'Sport',
    icon: '⚽',
    description: 'Physical exercise or sports',
    availableAt: ['park', 'school']
  },
  {
    id: 'rest',
    name: 'Rest',
    icon: '😴',
    description: 'Resting or sleeping',
    availableAt: ['home']
  },
  {
    id: 'work',
    name: 'Work',
    icon: '💼',
    description: 'Working activities',
    availableAt: ['home', 'office']
  },
  {
    id: 'indoor',
    name: 'Indoor',
    icon: '🏠',
    description: 'General indoor activities',
    availableAt: ['home', 'office', 'school']
  },
  {
    id: 'outdoor',
    name: 'Outdoor',
    icon: '🌤️',
    description: 'General outdoor activities',
    availableAt: ['park', 'mainStreet']
  },
  {
    id: 'undergroundTransport',
    name: 'Underground transport',
    icon: '🚇',
    description: 'Metro or subway',
    availableAt: ['transport']
  },
  {
    id: 'jogging',
    name: 'Jogging',
    icon: '🏃',
    description: 'Running or jogging',
    availableAt: ['park']
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛒',
    description: 'Shopping activities',
    availableAt: ['mainStreet']
  },
  {
    id: 'cooking',
    name: 'Cooking',
    icon: '👨‍🍳',
    description: 'Cooking or food preparation',
    availableAt: ['home']
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: '🧹',
    description: 'Household cleaning',
    availableAt: ['home']
  },
  {
    id: 'studying',
    name: 'Studying',
    icon: '📚',
    description: 'Reading or studying',
    availableAt: ['home', 'school']
  },
  {
    id: 'meeting',
    name: 'Meeting',
    icon: '👥',
    description: 'Business meetings',
    availableAt: ['office']
  },
  {
    id: 'computer_work',
    name: 'Computer work',
    icon: '💻',
    description: 'Working on computer',
    availableAt: ['home', 'office']
  },
  {
    id: 'classroom',
    name: 'Classroom',
    icon: '🎓',
    description: 'Attending classes',
    availableAt: ['school']
  },
  {
    id: 'bus',
    name: 'Bus',
    icon: '🚌',
    description: 'Traveling by bus',
    availableAt: ['transport']
  },
  {
    id: 'train',
    name: 'Train',
    icon: '🚊',
    description: 'Traveling by train',
    availableAt: ['transport']
  },
  {
    id: 'metro',
    name: 'Metro',
    icon: '🚇',
    description: 'Traveling by metro/subway',
    availableAt: ['transport']
  },
  {
    id: 'waiting',
    name: 'Waiting',
    icon: '⏳',
    description: 'Waiting or standing',
    availableAt: ['mainStreet', 'transport']
  },
  {
    id: 'relaxing',
    name: 'Relaxing',
    icon: '🧘',
    description: 'Relaxing outdoors',
    availableAt: ['park']
  },
  {
    id: 'DIY',
    name: 'DIY',
    icon: '🔨',
    description: 'DIY and home improvement activities',
    availableAt: ['home']
  },
  {
    id: 'Parking',
    name: 'Parking',
    icon: '🚗',
    description: 'Underground parking',
    availableAt: ['indoor']
  }
];

// Helper function to get activities available for a specific location
export function getActivitiesForLocation(locationId: string): ActivityType[] {
  return DEFAULT_ACTIVITIES.filter(activity => 
    activity.availableAt.includes(locationId)
  );
}

// Helper function to get locations where an activity is available
export function getLocationsForActivity(activityId: string): LocationType[] {
  const activity = DEFAULT_ACTIVITIES.find(a => a.id === activityId);
  if (!activity) return [];
  
  return DEFAULT_LOCATIONS.filter(location => 
    activity.availableAt.includes(location.id)
  );
}

// Helper function to check if an activity is allowed at a location
export function isActivityAllowedAtLocation(activityId: string, locationId: string): boolean {
  const activity = DEFAULT_ACTIVITIES.find(a => a.id === activityId);
  return activity ? activity.availableAt.includes(locationId) : false;
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