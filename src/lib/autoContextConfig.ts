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
      hourRange?: { start: number; end: number };
      isWeekend?: boolean;
    };
    connectivity?: {
      cellularSignal?: boolean;
      carBluetooth?: boolean;
    };
    weather?: {
      main?: 'Clear' | 'Clouds' | 'Rain' | 'Snow' | 'Thunderstorm' | 'Drizzle' | 'Mist' | 'Fog';
      temperature?: {
        min?: number;
        max?: number;
      };
      humidity?: {
        min?: number;
        max?: number;
      };
    };
    context?: {
      previousWifi?: 'home' | 'work';
      latestContextStartsWith?: string;
    };
  };
  result: string;
}

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
    isWeekend?: boolean;
  };
  connectivity: {
    cellularSignal: boolean;
    carBluetooth: boolean;
  };
  weather: {
    main: string;
    temperature: number;
    humidity: number;
  };
  context: {
    latestContext: string;
  };
}

// Streamlined rules with conflicts removed
export const DEFAULT_AUTO_CONTEXT_RULES: AutoContextRule[] = [
  // Highest priority: Car bluetooth (overrides everything when driving)
  {
    id: 'driving-car',
    name: 'Driving',
    description: 'Car bluetooth connected with movement',
    priority: 100,
    conditions: {
      connectivity: { carBluetooth: true },
      movement: { speed: { min: 5 } },
    },
    result: 'Driving',
  },

  // High priority: Time-based WiFi detection (no specific SSID needed)
  {
    id: 'wifi-work-hours',
    name: 'Indoor work',
    description: 'Connected to any WiFi during working hours (weekdays 9-18)',
    priority: 90,
    conditions: {
      wifi: { known: true }, // Any WiFi connection
      time: { hourRange: { start: 9, end: 18 } },
    },
    result: 'Indoor at work',
  },
  {
    id: 'wifi-home-evening',
    name: 'Indoor home (evening)',
    description: 'Connected to any WiFi during evening hours (18-23)',
    priority: 85,
    conditions: {
      wifi: { known: true }, // Any WiFi connection
      time: { hourRange: { start: 18, end: 23 } },
    },
    result: 'Indoor at home',
  },
  {
    id: 'wifi-home-morning',
    name: 'Indoor home (morning)',
    description: 'Connected to any WiFi during morning hours (6-9)',
    priority: 85,
    conditions: {
      wifi: { known: true }, // Any WiFi connection
      time: { hourRange: { start: 6, end: 9 } },
    },
    result: 'Indoor at home',
  },
  {
    id: 'wifi-home-weekend',
    name: 'Indoor home (weekend)',
    description: 'Connected to any WiFi during weekends',
    priority: 80,
    conditions: {
      wifi: { known: true }, // Any WiFi connection
      time: { isWeekend: true },
    },
    result: 'Indoor at home',
  },

  // Medium priority: Movement-based outdoor activities
  {
    id: 'outdoor-transport',
    name: 'High-speed transport',
    description: 'High speed movement without car bluetooth',
    priority: 75,
    conditions: {
      location: { gpsQuality: 'good' },
      movement: { speed: { min: 25 } },
      connectivity: { carBluetooth: false },
    },
    result: 'Outdoor transport',
  },
  {
    id: 'outdoor-cycling',
    name: 'Cycling',
    description: 'Medium speed outdoor movement',
    priority: 70,
    conditions: {
      location: { gpsQuality: 'good' },
      movement: { speed: { min: 8, max: 24 } },
    },
    result: 'Outdoor cycling',
  },
  {
    id: 'outdoor-walking',
    name: 'Walking',
    description: 'Slow outdoor movement',
    priority: 65,
    conditions: {
      location: { gpsQuality: 'good' },
      movement: { speed: { max: 7 } },
    },
    result: 'Outdoor walking',
  },

  // Time-based fallback rules (no WiFi dependency)
  {
    id: 'time-work-hours',
    name: 'Work hours',
    description: 'During typical work hours on weekdays',
    priority: 60,
    conditions: {
      time: { hourRange: { start: 9, end: 18 }, isWeekend: false },
    },
    result: 'At work',
  },
  {
    id: 'time-evening-home',
    name: 'Evening at home',
    description: 'Evening hours suggest home',
    priority: 58,
    conditions: {
      time: { hourRange: { start: 18, end: 23 } },
    },
    result: 'At home',
  },
  {
    id: 'time-morning-home',
    name: 'Morning at home',
    description: 'Early morning hours suggest home',
    priority: 58,
    conditions: {
      time: { hourRange: { start: 6, end: 9 } },
    },
    result: 'At home',
  },
  {
    id: 'time-weekend-home',
    name: 'Weekend at home',
    description: 'Weekend time suggests home',
    priority: 55,
    conditions: {
      time: { isWeekend: true },
      movement: { speed: { max: 5 } },
    },
    result: 'At home',
  },

  // Lower priority: Area-based detection
  {
    id: 'gps-home-outdoor',
    name: 'Outdoor at home',
    description: 'Good GPS in home area without home WiFi',
    priority: 50,
    conditions: {
      location: { insideHome: true, gpsQuality: 'good' },
      wifi: { home: false },
      movement: { speed: { max: 5 } },
    },
    result: 'Outdoor at home',
  },
  {
    id: 'gps-work-outdoor',
    name: 'Outdoor at work',
    description: 'Good GPS in work area without work WiFi',
    priority: 45,
    conditions: {
      location: { insideWork: true, gpsQuality: 'good' },
      wifi: { work: false },
      movement: { speed: { max: 5 } },
    },
    result: 'Outdoor at work',
  },

  // Fallback rules
  {
    id: 'generic-outdoor',
    name: 'Generic outdoor',
    description: 'Good GPS outside known areas',
    priority: 40,
    conditions: {
      location: { insideHome: false, insideWork: false, gpsQuality: 'good' },
    },
    result: 'Outdoor',
  },
  {
    id: 'generic-indoor',
    name: 'Generic indoor',
    description: 'Default indoor when conditions unclear',
    priority: 10,
    conditions: {},
    result: 'Indoor',
  },
];

// Rule evaluation engine
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

function matchesRule(
  rule: AutoContextRule,
  data: AutoContextEvaluationData
): boolean {
  const { conditions } = rule;

  // Check WiFi conditions
  if (conditions.wifi) {
    if (
      conditions.wifi.home !== undefined &&
      conditions.wifi.home !== data.wifi.home
    ) {
      return false;
    }
    if (
      conditions.wifi.work !== undefined &&
      conditions.wifi.work !== data.wifi.work
    ) {
      return false;
    }
    if (
      conditions.wifi.known !== undefined &&
      conditions.wifi.known !== data.wifi.known
    ) {
      return false;
    }
  }

  // Check location conditions
  if (conditions.location) {
    if (
      conditions.location.insideHome !== undefined &&
      conditions.location.insideHome !== data.location.insideHome
    ) {
      return false;
    }
    if (
      conditions.location.insideWork !== undefined &&
      conditions.location.insideWork !== data.location.insideWork
    ) {
      return false;
    }
    if (
      conditions.location.gpsQuality !== undefined &&
      conditions.location.gpsQuality !== data.location.gpsQuality
    ) {
      return false;
    }
  }

  // Check movement conditions
  if (conditions.movement) {
    if (
      conditions.movement.isMoving !== undefined &&
      conditions.movement.isMoving !== data.movement.isMoving
    ) {
      return false;
    }
    if (conditions.movement.speed) {
      if (
        conditions.movement.speed.min !== undefined &&
        data.movement.speed < conditions.movement.speed.min
      ) {
        return false;
      }
      if (
        conditions.movement.speed.max !== undefined &&
        data.movement.speed > conditions.movement.speed.max
      ) {
        return false;
      }
    }
  }

  // Check time conditions
  if (rule.conditions.time) {
    const { hourRange, isWeekend } = rule.conditions.time;
    
    if (hourRange) {
      const { start, end } = hourRange;
      const currentHour = data.time.currentHour;
      
      // Handle time ranges that cross midnight (e.g., 22-6)
      if (start <= end) {
        if (currentHour < start || currentHour >= end) return false;
      } else {
        if (currentHour < start && currentHour >= end) return false;
      }
    }
    
    if (isWeekend !== undefined && data.time.isWeekend !== isWeekend) {
      return false;
    }
  }

  // Check connectivity conditions
  if (conditions.connectivity) {
    if (
      conditions.connectivity.cellularSignal !== undefined &&
      conditions.connectivity.cellularSignal !==
        data.connectivity.cellularSignal
    ) {
      return false;
    }
    if (
      conditions.connectivity.carBluetooth !== undefined &&
      conditions.connectivity.carBluetooth !== data.connectivity.carBluetooth
    ) {
      return false;
    }
  }

  // Check weather conditions
  if (conditions.weather) {
    if (
      conditions.weather.main !== undefined &&
      conditions.weather.main !== data.weather.main
    ) {
      return false;
    }
    if (conditions.weather.temperature) {
      if (
        conditions.weather.temperature.min !== undefined &&
        data.weather.temperature < conditions.weather.temperature.min
      ) {
        return false;
      }
      if (
        conditions.weather.temperature.max !== undefined &&
        data.weather.temperature > conditions.weather.temperature.max
      ) {
        return false;
      }
    }
    if (conditions.weather.humidity) {
      if (
        conditions.weather.humidity.min !== undefined &&
        data.weather.humidity < conditions.weather.humidity.min
      ) {
        return false;
      }
      if (
        conditions.weather.humidity.max !== undefined &&
        data.weather.humidity > conditions.weather.humidity.max
      ) {
        return false;
      }
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
    if (
      conditions.context.latestContextStartsWith &&
      !data.context.latestContext.startsWith(
        conditions.context.latestContextStartsWith
      )
    ) {
      return false;
    }
  }

  return true;
}

// Rule templates for easy creation of new rules
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'location' | 'activity' | 'transport' | 'time' | 'custom';
  template: Omit<AutoContextRule, 'id'>;
}

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: 'indoor-gym',
    name: 'Indoor at gym',
    description: 'Specific WiFi network for gym',
    category: 'location',
    template: {
      name: 'Indoor at gym',
      description: 'Connected to gym WiFi',
      priority: 85,
      conditions: { wifi: { known: true } },
      result: 'Indoor at gym',
    },
  },
  {
    id: 'indoor-restaurant',
    name: 'Indoor restaurant',
    description: 'Restaurant or cafe WiFi',
    category: 'location',
    template: {
      name: 'Indoor restaurant',
      description: 'Connected to restaurant WiFi',
      priority: 85,
      conditions: { wifi: { known: true } },
      result: 'Indoor restaurant',
    },
  },
  {
    id: 'outdoor-jogging',
    name: 'Outdoor jogging',
    description: 'Jogging pace with good GPS',
    category: 'activity',
    template: {
      name: 'Outdoor jogging',
      description: 'Running/jogging speed outdoors',
      priority: 75,
      conditions: {
        location: { gpsQuality: 'good' },
        movement: { speed: { min: 8, max: 20 } },
      },
      result: 'Outdoor jogging',
    },
  },
];

// Rule management utilities
export class AutoContextConfig {
  private static STORAGE_KEY = 'customAutoContextRules';

  static saveCustomRules(rules: AutoContextRule[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rules));
  }

  static loadCustomRules(): AutoContextRule[] {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  static addRule(rule: AutoContextRule): AutoContextRule[] {
    const existing = this.loadCustomRules();
    const updated = [...existing, rule];
    this.saveCustomRules(updated);
    return updated;
  }

  static updateRule(
    ruleId: string,
    updates: Partial<AutoContextRule>
  ): AutoContextRule[] {
    const existing = this.loadCustomRules();
    const updated = existing.map((rule) =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    this.saveCustomRules(updated);
    return updated;
  }

  static deleteRule(ruleId: string): AutoContextRule[] {
    const existing = this.loadCustomRules();
    const updated = existing.filter((rule) => rule.id !== ruleId);
    this.saveCustomRules(updated);
    return updated;
  }

  static getAllRules(): AutoContextRule[] {
    const customRules = this.loadCustomRules();
    return [...DEFAULT_AUTO_CONTEXT_RULES, ...customRules];
  }

  static createRuleFromTemplate(
    templateId: string,
    customizations?: Partial<AutoContextRule>
  ): AutoContextRule {
    const template = RULE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const rule: AutoContextRule = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...template.template,
      ...customizations,
    };

    return rule;
  }
}
