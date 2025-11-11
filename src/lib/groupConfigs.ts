export interface GroupThreshold {
  name: string;
  pm1_min?: number;
  pm1_max?: number;
  pm25_min?: number;
  pm25_max?: number;
  pm10_min?: number;
  pm10_max?: number;
  color: string;
  enabled: boolean;
}

export interface GroupAlarm {
  name: string;
  pm1_threshold?: number;
  pm25_threshold?: number;
  pm10_threshold?: number;
  enabled: boolean;
  notification_frequency: 'immediate' | 'hourly' | 'daily';
}

export interface GroupActivity {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface GroupLocation {
  id: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  activities: GroupActivity[]; // Hierarchical structure
}

export interface GroupEvent {
  name: string;
  description?: string;
  event_type: 'custom' | 'holiday' | 'work' | 'personal';
  start_date?: string;
  end_date?: string;
  recurrence?: string;
  enabled: boolean;
}

export interface GroupConfig {
  id: string;
  name: string;
  description?: string;
  thresholds: GroupThreshold[];
  alarms: GroupAlarm[];
  locations: GroupLocation[]; // Locations with embedded activities
  events: GroupEvent[];
  settings: {
    pm25_threshold: number;
    pm10_threshold: number;
    pm1_threshold: number;
    alarm_enabled: boolean;
    auto_share_stats: boolean;
    notification_frequency: 'immediate' | 'hourly' | 'daily';
    location_auto_detect: boolean;
    activity_auto_suggest: boolean;
    event_notifications: boolean;
    weekly_reports: boolean;
  };
}

// Group configurations - edit this to add/modify groups
export const groupConfigs: Record<string, GroupConfig> = {
  'research-lab-001': {
    id: 'research-lab-001',
    name: 'Environmental Research Lab',
    description: 'Standard monitoring configuration for research participants',
    thresholds: [
      {
        name: 'Clean Air',
        pm25_min: 0,
        pm25_max: 12,
        pm10_min: 0,
        pm10_max: 20,
        pm1_min: 0,
        pm1_max: 8,
        color: '#22c55e',
        enabled: true,
      },
      {
        name: 'Moderate',
        pm25_min: 12,
        pm25_max: 35,
        pm10_min: 20,
        pm10_max: 50,
        pm1_min: 8,
        pm1_max: 25,
        color: '#eab308',
        enabled: true,
      },
      {
        name: 'Poor Quality',
        pm25_min: 100,
        pm25_max: 200,
        pm10_min: 150,
        pm10_max: 250,
        pm1_min: 88,
        pm1_max: 99,
        color: '#f97316',
        enabled: true,
      },
      {
        name: 'Hazardous',
        pm25_min: 75,
        pm10_min: 100,
        pm1_min: 50,
        color: '#ef4444',
        enabled: true,
      },
    ],
    alarms: [
      {
        name: 'Health Alert',
        pm25_threshold: 35,
        pm10_threshold: 50,
        pm1_threshold: 25,
        enabled: true,
        notification_frequency: 'immediate',
      },
    ],
    locations: [
      {
        id: 'gare-tgv',
        name: 'Gare TGV',
        description: 'Train station monitoring',
        activities: [
          { id: 'travaille', name: 'Travaille', description: 'Work activities', icon: '💼' },
          { id: 'ventilation', name: 'Ventilation', description: 'Ventilation monitoring', icon: '🌬️' },
        ]
      },
      {
        id: 'trame',
        name: 'Trame',
        description: 'Workplace environment',
        activities: [
          { id: 'travaille', name: 'Travaille', description: 'Work activities', icon: '💼' },
          { id: 'cuisine', name: 'Cuisine', description: 'Cooking activities', icon: '👨‍🍳' },
        ]
      },
      {
        id: 'rue',
        name: 'Rue',
        description: 'Street monitoring',
        activities: [
          { id: 'menage', name: 'Ménage', description: 'Cleaning activities', icon: '🧹' },
          { id: 'bricolage', name: 'Bricolage', description: 'DIY activities', icon: '🔨' },
        ]
      },
      {
        id: 'musee',
        name: 'Musée',
        description: 'Museum environment',
        activities: [
          { id: 'ventilation', name: 'Ventilation', description: 'Ventilation monitoring', icon: '🌬️' },
        ]
      },
      {
        id: 'maison',
        name: 'Maison',
        description: 'Home monitoring',
        activities: [
          { id: 'cuisine', name: 'Cuisine', description: 'Cooking activities', icon: '👨‍🍳' },
          { id: 'menage', name: 'Ménage', description: 'Cleaning activities', icon: '🧹' },
          { id: 'bricolage', name: 'Bricolage', description: 'DIY activities', icon: '🔨' },
          { id: 'ventilation', name: 'Ventilation', description: 'Ventilation monitoring', icon: '🌬️' },
        ]
      },
    ],
    events: [
      {
        name: 'Morning Rush Hour',
        description: 'High traffic period',
        event_type: 'custom',
        start_date: '07:00',
        end_date: '09:00',
        recurrence: 'daily',
        enabled: true,
      },
      {
        name: 'Evening Rush Hour',
        description: 'High traffic period',
        event_type: 'custom',
        start_date: '17:00',
        end_date: '19:00',
        recurrence: 'daily',
        enabled: true,
      },
    ],
    settings: {
      pm25_threshold: 35,
      pm10_threshold: 50,
      pm1_threshold: 25,
      alarm_enabled: true,
      auto_share_stats: false,
      notification_frequency: 'immediate',
      location_auto_detect: true,
      activity_auto_suggest: true,
      event_notifications: true,
      weekly_reports: true,
    },
  },

  'office-building-monitoring': {
    id: 'office-building-monitoring',
    name: 'Corporate Office Monitoring',
    description: 'Air quality monitoring for office buildings',
    thresholds: [
      {
        name: 'Excellent',
        pm25_max: 15,
        pm10_max: 25,
        pm1_max: 10,
        color: '#16a34a',
        enabled: true,
      },
      {
        name: 'Good',
        pm25_min: 15,
        pm25_max: 30,
        pm10_min: 25,
        pm10_max: 45,
        pm1_min: 10,
        pm1_max: 20,
        color: '#65a30d',
        enabled: true,
      },
      {
        name: 'Needs Attention',
        pm25_min: 30,
        pm10_min: 45,
        pm1_min: 20,
        color: '#dc2626',
        enabled: true,
      },
    ],
    alarms: [
      {
        name: 'Office Air Quality Alert',
        pm25_threshold: 30,
        pm10_threshold: 45,
        pm1_threshold: 20,
        enabled: true,
        notification_frequency: 'hourly',
      },
    ],
    locations: [
      {
        id: 'floor-1',
        name: 'Floor 1',
        description: 'Ground floor workspace',
        activities: [
          { id: 'desk-work', name: 'Desk Work', description: 'Computer-based tasks', icon: '💻' },
          { id: 'meeting', name: 'Meeting', description: 'Conference or discussion', icon: '👥' },
          { id: 'break', name: 'Break', description: 'Rest period', icon: '☕' },
        ]
      },
      {
        id: 'floor-2',
        name: 'Floor 2',
        description: 'Second floor workspace',
        activities: [
          { id: 'desk-work', name: 'Desk Work', description: 'Computer-based tasks', icon: '💻' },
          { id: 'meeting', name: 'Meeting', description: 'Conference or discussion', icon: '👥' },
        ]
      },
      {
        id: 'meeting-room-a',
        name: 'Meeting Room A',
        description: 'Conference room',
        activities: [
          { id: 'meeting', name: 'Meeting', description: 'Conference or discussion', icon: '👥' },
        ]
      },
      {
        id: 'break-room',
        name: 'Break Room',
        description: 'Kitchen and dining area',
        activities: [
          { id: 'break', name: 'Break', description: 'Rest period', icon: '☕' },
        ]
      },
    ],
    events: [],
    settings: {
      pm25_threshold: 30,
      pm10_threshold: 45,
      pm1_threshold: 20,
      alarm_enabled: true,
      auto_share_stats: true,
      notification_frequency: 'hourly',
      location_auto_detect: false,
      activity_auto_suggest: true,
      event_notifications: false,
      weekly_reports: true,
    },
  },
};

// Helper functions
export function getGroupConfig(groupId: string): GroupConfig | null {
  return groupConfigs[groupId] || null;
}

export function getAllGroupIds(): string[] {
  return Object.keys(groupConfigs);
}

// Helper function to check if string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper function to create URL-safe slug from group name
export function createGroupSlug(name: string, groupId?: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .trim();
  
  // Add UUID suffix for uniqueness if provided
  if (groupId && isUUID(groupId)) {
    const shortId = groupId.split('-')[0]; // Use first part of UUID
    return `${slug}-${shortId}`;
  }
  
  return slug;
}

// Helper function to extract group ID from slug
export function extractGroupIdFromSlug(slug: string): string | null {
  // Check if slug contains UUID suffix
  const parts = slug.split('-');
  const lastPart = parts[parts.length - 1];
  
  // If last part looks like start of UUID (8 hex chars), try to match with groups
  if (lastPart && /^[0-9a-f]{8}$/i.test(lastPart)) {
    return lastPart;
  }
  
  return null;
}

export function generateGroupUrl(
  groupId: string,
  groupName?: string,
  baseUrl: string = window.location.origin
): string {
  // If it's a UUID (database group), create name-based URL with /welcome path
  if (isUUID(groupId)) {
    if (groupName) {
      const slug = createGroupSlug(groupName, groupId);
      return `${baseUrl}/groups/${slug}/welcome`;
    }
    // Fallback to UUID if no name provided
    return `${baseUrl}/groups/${groupId}/welcome`;
  }
  // If it's a static config ID, use query parameter for backward compatibility
  return `${baseUrl}?group=${groupId}`;
}
