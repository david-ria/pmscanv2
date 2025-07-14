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

// Default rules that replicate the original hardcoded logic
export const DEFAULT_AUTO_CONTEXT_RULES: AutoContextRule[] = [
  // Highest priority: Car bluetooth (overrides everything when driving)
  {
    id: 'driving-car',
    name: 'Driving',
    description: 'Car bluetooth connected with movement',
    priority: 100,
    conditions: {
      connectivity: { carBluetooth: true },
      movement: { speed: { min: 5 } }
    },
    result: 'Driving'
  },
  {
    id: 'tunnel-driving',
    name: 'Driving in tunnel',
    description: 'No cellular signal while moving with car',
    priority: 98,
    conditions: {
      connectivity: { cellularSignal: false, carBluetooth: true },
      movement: { isMoving: true }
    },
    result: 'Driving in tunnel'
  },

  // High priority: WiFi-based indoor detection
  {
    id: 'wifi-home-wfh',
    name: 'Working from home',
    description: 'At home WiFi during work hours with poor GPS',
    priority: 95,
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

  // Medium-high priority: Underground/tunnel transport
  {
    id: 'underground-transport',
    name: 'Underground transport',
    description: 'No cellular signal while moving without car',
    priority: 85,
    conditions: {
      connectivity: { cellularSignal: false, carBluetooth: false },
      movement: { isMoving: true }
    },
    result: 'Underground transport'
  },

  // Medium priority: GPS-based outdoor activities (fixed logic)
  {
    id: 'outdoor-transport',
    name: 'High-speed transport',
    description: 'High speed movement without car bluetooth',
    priority: 75,
    conditions: {
      location: { gpsQuality: 'good' },
      movement: { speed: { min: 30 } },
      connectivity: { carBluetooth: false }
    },
    result: 'Outdoor transport'
  },
  {
    id: 'outdoor-cycling',
    name: 'Cycling',
    description: 'Medium speed outdoor movement',
    priority: 70,
    conditions: {
      location: { gpsQuality: 'good' },
      movement: { speed: { min: 7, max: 29 } } // Fixed overlap
    },
    result: 'Outdoor cycling'
  },
  {
    id: 'outdoor-walking',
    name: 'Walking',
    description: 'Slow outdoor movement',
    priority: 65,
    conditions: {
      location: { gpsQuality: 'good' },
      movement: { speed: { max: 6 } } // Fixed overlap
    },
    result: 'Outdoor walking'
  },

  // Lower priority: GPS area detection (fixed to be more specific)
  {
    id: 'gps-home-outdoor',
    name: 'Outdoor at home',
    description: 'Good GPS in home area without home WiFi',
    priority: 60,
    conditions: {
      location: { insideHome: true, gpsQuality: 'good' },
      wifi: { home: false }, // Only when NOT on home WiFi
      movement: { speed: { max: 5 } } // Not moving fast
    },
    result: 'Outdoor at home'
  },
  {
    id: 'gps-work-outdoor',
    name: 'Outdoor at work',
    description: 'Good GPS in work area without work WiFi',
    priority: 60,
    conditions: {
      location: { insideWork: true, gpsQuality: 'good' },
      wifi: { work: false }, // Only when NOT on work WiFi
      movement: { speed: { max: 5 } } // Not moving fast
    },
    result: 'Outdoor at work'
  },
  {
    id: 'gps-outdoor-generic',
    name: 'Outdoor generic',
    description: 'Good GPS outside known areas',
    priority: 55,
    conditions: {
      location: { insideHome: false, insideWork: false, gpsQuality: 'good' },
      movement: { speed: { max: 5 } } // Slow movement or stationary
    },
    result: 'Outdoor'
  },

  // Fallback rules (low priority, no conflicts)
  {
    id: 'likely-work',
    name: 'Likely at work',
    description: 'Coming from home WiFi during morning hours',
    priority: 40,
    conditions: {
      context: { previousWifi: 'home' },
      time: { hourRange: { start: 8, end: 10 } },
      wifi: { known: false } // Only when no known WiFi
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
      result: 'Indoor at gym'
    }
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
      result: 'Indoor restaurant'
    }
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
        movement: { speed: { min: 8, max: 20 } }
      },
      result: 'Outdoor jogging'
    }
  }
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

  static updateRule(ruleId: string, updates: Partial<AutoContextRule>): AutoContextRule[] {
    const existing = this.loadCustomRules();
    const updated = existing.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    this.saveCustomRules(updated);
    return updated;
  }

  static deleteRule(ruleId: string): AutoContextRule[] {
    const existing = this.loadCustomRules();
    const updated = existing.filter(rule => rule.id !== ruleId);
    this.saveCustomRules(updated);
    return updated;
  }

  static getAllRules(): AutoContextRule[] {
    const customRules = this.loadCustomRules();
    return [...DEFAULT_AUTO_CONTEXT_RULES, ...customRules];
  }

  static createRuleFromTemplate(templateId: string, customizations?: Partial<AutoContextRule>): AutoContextRule {
    const template = RULE_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const rule: AutoContextRule = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...template.template,
      ...customizations
    };

    return rule;
  }
}