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

export interface GroupLocation {
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface GroupActivity {
  name: string;
  description?: string;
  icon?: string;
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
  locations: GroupLocation[];
  activities: GroupActivity[];
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
        name: 'Gare TGV',
        description: 'Residential area monitoring',
      },
      {
        name: 'Trame',
        description: 'Workplace environment',
      },
      {
        name: 'Rue',
        description: 'External environment monitoring',
      },
      {
        name: 'Musée',
        description: 'Transportation monitoring',
      },
      {
        name: 'Maison',
        description: 'Transportation monitoring',
      },
    ],
    activities: [
      {
        name: 'Cuisine',
        description: 'Sedentary activities',
        icon: 'home',
      },
      {
        name: 'Travaille',
        description: 'Work-related activities',
        icon: 'briefcase',
      },
      {
        name: 'Ménage',
        description: 'Physical activities',
        icon: 'activity',
      },
      {
        name: 'Bricolage',
        description: 'Transportation activities',
        icon: 'car',
      },
      {
        name: 'Ventilation',
        description: 'Food preparation',
        icon: 'chef-hat',
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
        name: 'Floor 1',
        description: 'Ground floor workspace',
      },
      {
        name: 'Floor 2',
        description: 'Second floor workspace',
      },
      {
        name: 'Meeting Room A',
        description: 'Conference room',
      },
      {
        name: 'Break Room',
        description: 'Kitchen and dining area',
      },
    ],
    activities: [
      {
        name: 'Desk Work',
        description: 'Computer-based tasks',
        icon: 'monitor',
      },
      {
        name: 'Meeting',
        description: 'Conference or discussion',
        icon: 'users',
      },
      {
        name: 'Break',
        description: 'Rest period',
        icon: 'coffee',
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

export function generateGroupUrl(
  groupId: string,
  baseUrl: string = window.location.origin
): string {
  return `${baseUrl}?group=${groupId}`;
}
