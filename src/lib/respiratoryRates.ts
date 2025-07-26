/**
 * Respiratory rates (m³/h) for different activities
 * Based on EPA guidelines and scientific literature
 */

interface RespiratoryRateMapping {
  [key: string]: number;
}

// Default respiratory rates for common activities (m³/h)
export const RESPIRATORY_RATES: RespiratoryRateMapping = {
  // Rest/Sedentary activities (0.4-0.6 m³/h)
  'rest': 0.5,
  'sleeping': 0.4,
  'sitting': 0.5,
  'reading': 0.5,
  'watching_tv': 0.5,
  'computer_work': 0.5,
  'office_work': 0.5,
  
  // Light activities (0.6-1.0 m³/h)
  'light_housework': 0.8,
  'cooking': 0.8,
  'eating': 0.6,
  'standing': 0.6,
  'driving': 0.6,
  'light_office': 0.7,
  
  // Moderate activities (1.0-1.5 m³/h)
  'walking': 1.2,
  'walking_slow': 1.0,
  'walking_moderate': 1.2,
  'shopping': 1.1,
  'cleaning': 1.3,
  'gardening': 1.4,
  'moderate_housework': 1.3,
  
  // Active/Exercise (1.5-3.0 m³/h)
  'walking_fast': 1.8,
  'jogging': 2.5,
  'running': 3.0,
  'cycling': 2.2,
  'cycling_moderate': 2.0,
  'cycling_intense': 2.8,
  'sports': 2.5,
  'exercise': 2.3,
  'gym': 2.3,
  'dancing': 2.0,
  
  // High intensity (3.0+ m³/h)
  'running_fast': 3.5,
  'intense_sports': 3.2,
  'intense_exercise': 3.0,
  
  // Location-based defaults when activity is unknown
  'home': 0.6,
  'work': 0.7,
  'office': 0.7,
  'outdoor': 1.2,
  'indoor': 0.6,
  'transport': 0.6,
  'car': 0.6,
  'public_transport': 0.6,
  'school': 0.7,
  'restaurant': 0.6,
  'shop': 1.0,
  'gym_location': 2.3,
};

// Default rate for unknown activities (moderate activity level)
export const DEFAULT_RESPIRATORY_RATE = 0.8;

/**
 * Get respiratory rate for a given activity or location context
 * @param activityContext - The activity context
 * @param locationContext - The location context (fallback)
 * @param automaticContext - The automatic context (fallback)
 * @returns Respiratory rate in m³/h
 */
export function getRespiratoryRate(
  activityContext?: string,
  locationContext?: string,
  automaticContext?: string
): number {
  // Priority: activity > automatic context > location > default
  
  // First, try to match activity context
  if (activityContext) {
    const normalizedActivity = normalizeContextKey(activityContext);
    if (RESPIRATORY_RATES[normalizedActivity] !== undefined) {
      return RESPIRATORY_RATES[normalizedActivity];
    }
    
    // Try partial matches for activity
    const activityMatch = findPartialMatch(normalizedActivity, RESPIRATORY_RATES);
    if (activityMatch !== null) {
      return activityMatch;
    }
  }
  
  // Try automatic context
  if (automaticContext) {
    const normalizedAuto = normalizeContextKey(automaticContext);
    if (RESPIRATORY_RATES[normalizedAuto] !== undefined) {
      return RESPIRATORY_RATES[normalizedAuto];
    }
    
    const autoMatch = findPartialMatch(normalizedAuto, RESPIRATORY_RATES);
    if (autoMatch !== null) {
      return autoMatch;
    }
  }
  
  // Try location context as fallback
  if (locationContext) {
    const normalizedLocation = normalizeContextKey(locationContext);
    if (RESPIRATORY_RATES[normalizedLocation] !== undefined) {
      return RESPIRATORY_RATES[normalizedLocation];
    }
    
    const locationMatch = findPartialMatch(normalizedLocation, RESPIRATORY_RATES);
    if (locationMatch !== null) {
      return locationMatch;
    }
  }
  
  return DEFAULT_RESPIRATORY_RATE;
}

/**
 * Normalize context key for matching
 * @param context - Context string to normalize
 * @returns Normalized context key
 */
function normalizeContextKey(context: string): string {
  return context
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Find partial match in respiratory rates
 * @param normalizedContext - Normalized context to search
 * @param rates - Respiratory rates mapping
 * @returns Matching rate or null
 */
function findPartialMatch(normalizedContext: string, rates: RespiratoryRateMapping): number | null {
  // Check if any key in rates is contained in the context or vice versa
  for (const [key, rate] of Object.entries(rates)) {
    if (normalizedContext.includes(key) || key.includes(normalizedContext)) {
      return rate;
    }
  }
  
  // Special cases for common patterns
  if (normalizedContext.includes('walk')) return rates['walking'];
  if (normalizedContext.includes('run')) return rates['running'];
  if (normalizedContext.includes('cycl') || normalizedContext.includes('bike')) return rates['cycling'];
  if (normalizedContext.includes('sport')) return rates['sports'];
  if (normalizedContext.includes('exerc')) return rates['exercise'];
  if (normalizedContext.includes('work') && normalizedContext.includes('house')) return rates['light_housework'];
  if (normalizedContext.includes('driv')) return rates['driving'];
  if (normalizedContext.includes('sit')) return rates['sitting'];
  if (normalizedContext.includes('stand')) return rates['standing'];
  
  return null;
}

/**
 * Get a human-readable description of the respiratory rate
 * @param rate - Respiratory rate in m³/h
 * @returns Description of the activity level
 */
export function getActivityLevelDescription(rate: number): string {
  if (rate <= 0.6) return 'Repos/Sédentaire';
  if (rate <= 1.0) return 'Activité légère';
  if (rate <= 1.5) return 'Activité modérée';
  if (rate <= 3.0) return 'Activité intense';
  return 'Activité très intense';
}