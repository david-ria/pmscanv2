/**
 * Utility functions for formatting automatic context
 */

/**
 * Formats automatic context by combining enriched location name with activity context
 * @param enrichedLocationName - The enriched location name from Nominatim API
 * @param ruleBasedContext - The rule-based context from auto context system
 * @returns Formatted context string
 */
export function formatAutomaticContext(
  enrichedLocationName?: string,
  ruleBasedContext?: string
): string {
  // Prioritize enriched location name
  if (enrichedLocationName) {
    // If we also have rule-based context that adds useful activity info, combine them
    if (ruleBasedContext && !ruleBasedContext.toLowerCase().includes('unknown')) {
      // Check if rule-based context provides activity information
      const activityIndicators = ['walking', 'cycling', 'driving', 'indoor', 'outdoor'];
      const hasActivity = activityIndicators.some(activity => 
        ruleBasedContext.toLowerCase().includes(activity)
      );
      
      if (hasActivity) {
        return `${enrichedLocationName} (${ruleBasedContext})`;
      }
    }
    
    return enrichedLocationName;
  }
  
  // Fallback to rule-based context
  return ruleBasedContext || '';
}

/**
 * Extracts activity type from rule-based context
 * @param ruleBasedContext - The rule-based context string
 * @returns Activity type or null if not found
 */
export function extractActivityFromContext(ruleBasedContext?: string): string | null {
  if (!ruleBasedContext) return null;
  
  const context = ruleBasedContext.toLowerCase();
  
  if (context.includes('driving')) return 'Driving';
  if (context.includes('walking')) return 'Walking';
  if (context.includes('cycling')) return 'Cycling';
  if (context.includes('indoor')) return 'Indoor';
  if (context.includes('outdoor')) return 'Outdoor';
  
  return null;
}