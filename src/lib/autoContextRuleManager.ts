import { AutoContextRule, DEFAULT_AUTO_CONTEXT_RULES } from './autoContextRules';

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'location' | 'activity' | 'transport' | 'time' | 'custom';
  template: Omit<AutoContextRule, 'id'>;
}

export const RULE_TEMPLATES: RuleTemplate[] = [
  // Location-based templates
  {
    id: 'indoor-gym',
    name: 'Indoor at gym',
    description: 'Specific WiFi network for gym',
    category: 'location',
    template: {
      name: 'Indoor at gym',
      description: 'Connected to gym WiFi',
      priority: 85,
      conditions: {
        wifi: { known: true }
      },
      result: 'Indoor at gym'
    }
  },
  {
    id: 'indoor-shopping',
    name: 'Indoor shopping',
    description: 'Shopping center or mall WiFi',
    category: 'location',
    template: {
      name: 'Indoor shopping',
      description: 'Connected to shopping center WiFi',
      priority: 85,
      conditions: {
        wifi: { known: true }
      },
      result: 'Indoor shopping'
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
      conditions: {
        wifi: { known: true }
      },
      result: 'Indoor restaurant'
    }
  },

  // Activity-based templates
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
  },
  {
    id: 'outdoor-exercise',
    name: 'Outdoor exercise',
    description: 'Stationary outdoor exercise',
    category: 'activity',
    template: {
      name: 'Outdoor exercise',
      description: 'Minimal movement outdoors',
      priority: 70,
      conditions: {
        location: { gpsQuality: 'good' },
        movement: { speed: { max: 2 } }
      },
      result: 'Outdoor exercise'
    }
  },

  // Transport-based templates
  {
    id: 'train-transport',
    name: 'Train transport',
    description: 'Train-like speed pattern',
    category: 'transport',
    template: {
      name: 'Train transport',
      description: 'High speed with stops',
      priority: 80,
      conditions: {
        movement: { speed: { min: 40, max: 120 } }
      },
      result: 'Train transport'
    }
  },
  {
    id: 'bus-transport',
    name: 'Bus transport',
    description: 'Bus-like speed pattern',
    category: 'transport',
    template: {
      name: 'Bus transport',
      description: 'Medium speed with frequent stops',
      priority: 75,
      conditions: {
        movement: { speed: { min: 15, max: 50 } }
      },
      result: 'Bus transport'
    }
  },

  // Time-based templates
  {
    id: 'night-indoor',
    name: 'Night indoor',
    description: 'Late night hours indoors',
    category: 'time',
    template: {
      name: 'Night indoor',
      description: 'Indoor during night hours',
      priority: 50,
      conditions: {
        time: { hourRange: { start: 22, end: 6 } },
        movement: { speed: { max: 1 } }
      },
      result: 'Indoor at night'
    }
  },
  {
    id: 'early-morning-commute',
    name: 'Morning commute',
    description: 'Early morning movement',
    category: 'time',
    template: {
      name: 'Morning commute',
      description: 'Movement during early morning hours',
      priority: 65,
      conditions: {
        time: { hourRange: { start: 7, end: 9 } },
        movement: { speed: { min: 5 } }
      },
      result: 'Morning commute'
    }
  }
];

export class AutoContextRuleManager {
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

  static validateRule(rule: AutoContextRule): string[] {
    const errors: string[] = [];

    if (!rule.id || !rule.id.trim()) {
      errors.push('Rule ID is required');
    }

    if (!rule.name || !rule.name.trim()) {
      errors.push('Rule name is required');
    }

    if (!rule.result || !rule.result.trim()) {
      errors.push('Rule result is required');
    }

    if (typeof rule.priority !== 'number' || rule.priority < 0 || rule.priority > 100) {
      errors.push('Priority must be a number between 0 and 100');
    }

    // Validate conditions structure
    if (rule.conditions.movement?.speed) {
      const { min, max } = rule.conditions.movement.speed;
      if (min !== undefined && max !== undefined && min > max) {
        errors.push('Speed minimum cannot be greater than maximum');
      }
    }

    if (rule.conditions.time?.hourRange) {
      const { start, end } = rule.conditions.time.hourRange;
      if (start < 0 || start > 23 || end < 0 || end > 23) {
        errors.push('Hour range must be between 0 and 23');
      }
    }

    return errors;
  }

  static exportRules(): string {
    return JSON.stringify(this.getAllRules(), null, 2);
  }

  static importRules(jsonString: string): void {
    try {
      const rules = JSON.parse(jsonString) as AutoContextRule[];
      const customRules = rules.filter(rule => 
        !DEFAULT_AUTO_CONTEXT_RULES.some(defaultRule => defaultRule.id === rule.id)
      );
      this.saveCustomRules(customRules);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }
}