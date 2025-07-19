// Events management system - separate from locations/activities

export interface EventType {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  category: 'environmental' | 'personal' | 'traffic' | 'weather' | 'custom';
  duration?: number; // Expected duration in minutes
  impactLevel: 'low' | 'medium' | 'high'; // Expected air quality impact
}

export interface EventTrigger {
  id: string;
  name: string;
  description: string;
  eventTypeId: string;
  conditions: {
    pm25_threshold?: number;
    pm10_threshold?: number;
    pm1_threshold?: number;
    duration_minutes?: number;
    time_range?: {
      start: string; // HH:MM format
      end: string; // HH:MM format
    };
    location_based?: boolean;
    activity_based?: boolean;
  };
  enabled: boolean;
}

// Default event types
export const DEFAULT_EVENT_TYPES: EventType[] = [
  {
    id: 'traffic_jam',
    name: 'Traffic jam',
    icon: '🚗',
    description: 'Heavy traffic congestion',
    category: 'traffic',
    duration: 15,
    impactLevel: 'high'
  },
  {
    id: 'construction',
    name: 'Construction work',
    icon: '🚧',
    description: 'Construction or roadwork nearby',
    category: 'environmental',
    duration: 30,
    impactLevel: 'high'
  },
  {
    id: 'cooking',
    name: 'Cooking',
    icon: '👨‍🍳',
    description: 'Cooking activities',
    category: 'personal',
    duration: 30,
    impactLevel: 'medium'
  },
  {
    id: 'smoking_nearby',
    name: 'Smoking nearby',
    icon: '🚬',
    description: 'Someone smoking in vicinity',
    category: 'environmental',
    duration: 5,
    impactLevel: 'high'
  },
  {
    id: 'vehicle_exhaust',
    name: 'Vehicle exhaust',
    icon: '💨',
    description: 'Direct exposure to vehicle exhaust',
    category: 'traffic',
    duration: 2,
    impactLevel: 'high'
  },
  {
    id: 'dust_storm',
    name: 'Dust/wind',
    icon: '💨',
    description: 'Windy conditions or dust',
    category: 'weather',
    duration: 10,
    impactLevel: 'medium'
  },
  {
    id: 'industrial_emission',
    name: 'Industrial emission',
    icon: '🏭',
    description: 'Industrial pollution source',
    category: 'environmental',
    duration: 20,
    impactLevel: 'high'
  },
  {
    id: 'burning',
    name: 'Burning smell',
    icon: '🔥',
    description: 'Burning wood, plastic, or other materials',
    category: 'environmental',
    duration: 15,
    impactLevel: 'high'
  },
  {
    id: 'cleaning_products',
    name: 'Cleaning products',
    icon: '🧽',
    description: 'Using chemical cleaning products',
    category: 'personal',
    duration: 10,
    impactLevel: 'medium'
  },
  {
    id: 'air_freshener',
    name: 'Air freshener/perfume',
    icon: '🌸',
    description: 'Strong fragrances or air fresheners',
    category: 'personal',
    duration: 5,
    impactLevel: 'low'
  },
  {
    id: 'tunnel_entry',
    name: 'Tunnel/underground',
    icon: '🌉',
    description: 'Entering tunnel or underground space',
    category: 'traffic',
    duration: 5,
    impactLevel: 'medium'
  },
  {
    id: 'public_transport',
    name: 'Crowded transport',
    icon: '🚇',
    description: 'Crowded bus, metro, or train',
    category: 'traffic',
    duration: 20,
    impactLevel: 'medium'
  },
  {
    id: 'exercise',
    name: 'Physical exercise',
    icon: '🏃',
    description: 'Intensive physical activity',
    category: 'personal',
    duration: 30,
    impactLevel: 'low'
  },
  {
    id: 'window_open',
    name: 'Window opened',
    icon: '🪟',
    description: 'Opening windows for ventilation',
    category: 'personal',
    duration: 10,
    impactLevel: 'medium'
  },
  {
    id: 'air_purifier',
    name: 'Air purifier on',
    icon: '💨',
    description: 'Air purifier or ventilation system active',
    category: 'personal',
    duration: 60,
    impactLevel: 'low'
  }
];

// Get events by category
export function getEventsByCategory(category: EventType['category']): EventType[] {
  return DEFAULT_EVENT_TYPES.filter(event => event.category === category);
}

// Get event by ID
export function getEventTypeById(eventId: string): EventType | undefined {
  return DEFAULT_EVENT_TYPES.find(event => event.id === eventId);
}

// Get translated event name
export function getEventName(eventId: string, t: (key: string) => string): string {
  const eventType = getEventTypeById(eventId);
  if (!eventType) return eventId;
  
  // Try to get translation, fallback to default name
  try {
    return t(`events.${eventId}`);
  } catch {
    return eventType.name;
  }
}

// Analyze event impact on air quality
export function analyzeEventImpact(
  eventTypeId: string,
  measurementsBefore: number[],
  measurementsDuring: number[],
  measurementsAfter: number[]
): {
  impactDetected: boolean;
  impactPercentage: number;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
} {
  const eventType = getEventTypeById(eventTypeId);
  if (!eventType) {
    return {
      impactDetected: false,
      impactPercentage: 0,
      severity: 'low',
      recommendation: 'Event type not found'
    };
  }

  const avgBefore = measurementsBefore.length > 0 
    ? measurementsBefore.reduce((a, b) => a + b, 0) / measurementsBefore.length 
    : 0;
  
  const avgDuring = measurementsDuring.length > 0 
    ? measurementsDuring.reduce((a, b) => a + b, 0) / measurementsDuring.length 
    : 0;
  
  const avgAfter = measurementsAfter.length > 0 
    ? measurementsAfter.reduce((a, b) => a + b, 0) / measurementsAfter.length 
    : 0;

  const baseline = (avgBefore + avgAfter) / 2;
  const impactPercentage = baseline > 0 ? ((avgDuring - baseline) / baseline) * 100 : 0;
  
  const impactDetected = Math.abs(impactPercentage) > 10; // 10% change threshold
  
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (Math.abs(impactPercentage) > 50) severity = 'high';
  else if (Math.abs(impactPercentage) > 25) severity = 'medium';

  const recommendation = generateEventRecommendation(eventType, impactPercentage, severity);

  return {
    impactDetected,
    impactPercentage,
    severity,
    recommendation
  };
}

function generateEventRecommendation(
  eventType: EventType,
  impactPercentage: number,
  severity: 'low' | 'medium' | 'high'
): string {
  if (impactPercentage < -10) {
    return `Great! The ${eventType.name} event actually improved air quality by ${Math.abs(impactPercentage).toFixed(1)}%.`;
  }

  if (severity === 'low') {
    return `The ${eventType.name} event had minimal impact on air quality (+${impactPercentage.toFixed(1)}%).`;
  }

  if (severity === 'medium') {
    return `The ${eventType.name} event increased pollution levels by ${impactPercentage.toFixed(1)}%. Consider avoiding similar situations when possible.`;
  }

  // High severity
  switch (eventType.category) {
    case 'traffic':
      return `High pollution increase (+${impactPercentage.toFixed(1)}%) from ${eventType.name}. Try to avoid heavy traffic areas or use alternative routes.`;
    case 'environmental':
      return `Significant pollution spike (+${impactPercentage.toFixed(1)}%) from ${eventType.name}. Move away from the source if possible.`;
    case 'personal':
      return `Your ${eventType.name} activity increased pollution exposure by ${impactPercentage.toFixed(1)}%. Consider reducing frequency or improving ventilation.`;
    case 'weather':
      return `Weather-related pollution increase (+${impactPercentage.toFixed(1)}%). Stay indoors during similar conditions.`;
    default:
      return `High pollution impact (+${impactPercentage.toFixed(1)}%) detected. Take precautions to minimize exposure.`;
  }
}

// Default event triggers
export const DEFAULT_EVENT_TRIGGERS: EventTrigger[] = [
  {
    id: 'high_pm25_trigger',
    name: 'High PM2.5 Alert',
    description: 'Trigger when PM2.5 levels exceed WHO guidelines',
    eventTypeId: 'custom',
    conditions: {
      pm25_threshold: 25,
      duration_minutes: 5
    },
    enabled: true
  },
  {
    id: 'traffic_hour_trigger',
    name: 'Rush Hour Traffic',
    description: 'Automatically log traffic events during rush hours',
    eventTypeId: 'traffic_jam',
    conditions: {
      time_range: { start: '07:00', end: '09:00' },
      pm25_threshold: 20
    },
    enabled: false
  },
  {
    id: 'cooking_time_trigger',
    name: 'Cooking Time',
    description: 'Suggest logging cooking events during meal times',
    eventTypeId: 'cooking',
    conditions: {
      time_range: { start: '18:00', end: '20:00' },
      location_based: true
    },
    enabled: false
  }
];