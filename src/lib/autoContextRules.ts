export interface AutoContextRule {
  id: string;
  name: string;
  description: string;
  priority: number; // Higher number = higher priority
  conditions: {
    wifi?: {
      home?: boolean;
      work?: boolean;
      known?: boolean;
    };
    location?: {
      insideHome?: boolean;
      insideWork?: boolean;
      gpsQuality?: 'good' | 'poor';
    };
    movement?: {
      speed?: {
        min?: number;
        max?: number;
      };
      isMoving?: boolean;
    };
    time?: {
      hourRange?: {
        start: number;
        end: number;
      };
    };
    connectivity?: {
      cellularSignal?: boolean;
      carBluetooth?: boolean;
    };
    context?: {
      previousWifi?: 'home' | 'work';
      latestContextStartsWith?: string;
    };
  };
  result: string;
}

export const DEFAULT_AUTO_CONTEXT_RULES: AutoContextRule[] = [
  // High priority WiFi-based rules
  {
    id: 'wifi-home-wfh',
    name: 'Working from home',
    description: 'At home WiFi during work hours with poor GPS',
    priority: 100,
    conditions: {
      wifi: { home: true },
      location: { gpsQuality: 'poor' },
      time: { hourRange: { start: 8, end: 18 } },
      context: { previousWifi: 'home' }
    },
    result: 'Indoor at home (working from home)'
  },
  {
    id: 'wifi-home',
    name: 'At home',
    description: 'Connected to home WiFi',
    priority: 90,
    conditions: {
      wifi: { home: true }
    },
    result: 'Indoor at home'
  },
  {
    id: 'wifi-work',
    name: 'At work',
    description: 'Connected to work WiFi',
    priority: 90,
    conditions: {
      wifi: { work: true }
    },
    result: 'Indoor at work'
  },

  // GPS-based rules (medium priority)
  {
    id: 'gps-home-area',
    name: 'Home area',
    description: 'Good GPS signal in home area',
    priority: 70,
    conditions: {
      location: { insideHome: true, gpsQuality: 'good' }
    },
    result: 'Outdoor'
  },
  {
    id: 'gps-work-area',
    name: 'Work area',
    description: 'Good GPS signal in work area',
    priority: 70,
    conditions: {
      location: { insideWork: true, gpsQuality: 'good' }
    },
    result: 'Outdoor'
  },

  // Transportation rules (high priority when conditions match)
  {
    id: 'driving-car',
    name: 'Driving',
    description: 'Car bluetooth connected with movement',
    priority: 95,
    conditions: {
      connectivity: { carBluetooth: true },
      movement: { speed: { min: 5 } }
    },
    result: 'Driving'
  },
  {
    id: 'walking',
    name: 'Walking',
    description: 'Slow outdoor movement',
    priority: 60,
    conditions: {
      location: { gpsQuality: 'good' },
      movement: { speed: { max: 7 } }
    },
    result: 'Outdoor walking'
  },
  {
    id: 'cycling',
    name: 'Cycling',
    description: 'Medium speed outdoor movement',
    priority: 60,
    conditions: {
      location: { gpsQuality: 'good' },
      movement: { speed: { min: 7, max: 30 } }
    },
    result: 'Outdoor cycling'
  },
  {
    id: 'transport',
    name: 'Transport',
    description: 'High speed movement without car',
    priority: 60,
    conditions: {
      location: { gpsQuality: 'good' },
      movement: { speed: { min: 30 } },
      connectivity: { carBluetooth: false }
    },
    result: 'Outdoor transport'
  },

  // Special connectivity rules
  {
    id: 'tunnel-driving',
    name: 'Driving in tunnel',
    description: 'No cellular signal while moving with car',
    priority: 85,
    conditions: {
      connectivity: { cellularSignal: false, carBluetooth: true },
      movement: { isMoving: true }
    },
    result: 'Driving in tunnel'
  },
  {
    id: 'underground-transport',
    name: 'Underground transport',
    description: 'No cellular signal while moving without car',
    priority: 80,
    conditions: {
      connectivity: { cellularSignal: false, carBluetooth: false },
      movement: { isMoving: true }
    },
    result: 'Underground transport'
  },

  // Fallback rules (low priority)
  {
    id: 'likely-work',
    name: 'Likely at work',
    description: 'Coming from home WiFi during morning hours',
    priority: 40,
    conditions: {
      context: { previousWifi: 'home' },
      time: { hourRange: { start: 8, end: 10 } }
    },
    result: 'Likely indoor at work'
  },
  {
    id: 'maintain-indoor',
    name: 'Maintain indoor context',
    description: 'No WiFi but was previously indoor',
    priority: 30,
    conditions: {
      wifi: { known: false },
      context: { latestContextStartsWith: 'Indoor' }
    },
    result: 'Indoor'
  },
  {
    id: 'generic-indoor',
    name: 'Generic indoor',
    description: 'Default indoor when conditions unclear',
    priority: 10,
    conditions: {},
    result: 'Indoor'
  }
];

export interface AutoContextInputs {
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  speed?: number;
}

export interface AutoContextEvaluationData {
  wifi: {
    home: boolean;
    work: boolean;
    known: boolean;
    currentSSID: string | null;
    previousSSID: string | null;
  };
  location: {
    insideHome: boolean;
    insideWork: boolean;
    gpsQuality: 'good' | 'poor';
  };
  movement: {
    speed: number;
    isMoving: boolean;
  };
  time: {
    currentHour: number;
  };
  connectivity: {
    cellularSignal: boolean;
    carBluetooth: boolean;
  };
  context: {
    latestContext: string;
  };
}

export function evaluateAutoContextRules(
  rules: AutoContextRule[],
  data: AutoContextEvaluationData
): string {
  // Sort rules by priority (highest first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    if (matchesRule(rule, data)) {
      return rule.result;
    }
  }

  return 'Unknown';
}

function matchesRule(rule: AutoContextRule, data: AutoContextEvaluationData): boolean {
  const { conditions } = rule;

  // Check WiFi conditions
  if (conditions.wifi) {
    if (conditions.wifi.home !== undefined && conditions.wifi.home !== data.wifi.home) {
      return false;
    }
    if (conditions.wifi.work !== undefined && conditions.wifi.work !== data.wifi.work) {
      return false;
    }
    if (conditions.wifi.known !== undefined && conditions.wifi.known !== data.wifi.known) {
      return false;
    }
  }

  // Check location conditions
  if (conditions.location) {
    if (conditions.location.insideHome !== undefined && conditions.location.insideHome !== data.location.insideHome) {
      return false;
    }
    if (conditions.location.insideWork !== undefined && conditions.location.insideWork !== data.location.insideWork) {
      return false;
    }
    if (conditions.location.gpsQuality !== undefined && conditions.location.gpsQuality !== data.location.gpsQuality) {
      return false;
    }
  }

  // Check movement conditions
  if (conditions.movement) {
    if (conditions.movement.isMoving !== undefined && conditions.movement.isMoving !== data.movement.isMoving) {
      return false;
    }
    if (conditions.movement.speed) {
      if (conditions.movement.speed.min !== undefined && data.movement.speed < conditions.movement.speed.min) {
        return false;
      }
      if (conditions.movement.speed.max !== undefined && data.movement.speed > conditions.movement.speed.max) {
        return false;
      }
    }
  }

  // Check time conditions
  if (conditions.time?.hourRange) {
    const { start, end } = conditions.time.hourRange;
    if (data.time.currentHour < start || data.time.currentHour > end) {
      return false;
    }
  }

  // Check connectivity conditions
  if (conditions.connectivity) {
    if (conditions.connectivity.cellularSignal !== undefined && conditions.connectivity.cellularSignal !== data.connectivity.cellularSignal) {
      return false;
    }
    if (conditions.connectivity.carBluetooth !== undefined && conditions.connectivity.carBluetooth !== data.connectivity.carBluetooth) {
      return false;
    }
  }

  // Check context conditions
  if (conditions.context) {
    if (conditions.context.previousWifi === 'home' && !data.wifi.previousSSID) {
      return false;
    }
    if (conditions.context.previousWifi === 'work' && !data.wifi.previousSSID) {
      return false;
    }
    if (conditions.context.latestContextStartsWith && !data.context.latestContext.startsWith(conditions.context.latestContextStartsWith)) {
      return false;
    }
  }

  return true;
}