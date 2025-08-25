import { DEFAULT_LOCATIONS } from "@/lib/locationsActivities";
/**
 * Centralized context management utilities to ensure consistency
 * across recording, storage, and display of location/activity contexts
 */

export interface StandardContext {
  location?: string;
  activity?: string;
  automatic?: string;
}

export interface ContextPrecedence {
  preferAutomatic: boolean;
  fallbackToMission: boolean;
}

/**
 * Normalize context data from various sources into standard format
 */
export function normalizeContext(
  measurementContext?: { 
    locationContext?: string; 
    activityContext?: string; 
    automaticContext?: string; 
  },
  recordingContext?: { location?: string; activity?: string },
  missionContext?: { location?: string; activity?: string; locationContext?: string; activityContext?: string },
  automaticContext?: string
): StandardContext {
  return {
    location: measurementContext?.locationContext || 
             recordingContext?.location || 
             missionContext?.locationContext || 
             missionContext?.location,
    activity: measurementContext?.activityContext || 
             recordingContext?.activity || 
             missionContext?.activityContext || 
             missionContext?.activity,
    automatic: measurementContext?.automaticContext || automaticContext
  };
}

/**
 * Get the effective context value based on precedence rules
 */
export function getEffectiveContext(
  type: 'location' | 'activity',
  context: StandardContext,
  precedence: ContextPrecedence = { preferAutomatic: false, fallbackToMission: true }
): string | undefined {
  if (type === 'location') {
    if (precedence.preferAutomatic && context.automatic) {
      return context.automatic;
    }
    return context.location;
  }
  
  if (type === 'activity') {
    if (precedence.preferAutomatic && context.automatic) {
      return context.automatic;
    }
    return context.activity;
  }
  
  return undefined;
}

/**
 * Validate that a location-activity combination is allowed
 */
export function validateLocationActivityPair(location: string, activity: string): boolean {
  // Import here to avoid circular dependency
  
  
  const locationData = DEFAULT_LOCATIONS.find((loc: any) => 
    loc.name === location || loc.id === location
  );
  
  if (!locationData) return false;
  
  // Check if activity is allowed for this location
  return locationData.allowedActivities.some((allowedActivity: string) => {
    // Match by ID or name
    return allowedActivity === activity || 
           allowedActivity.toLowerCase() === activity.toLowerCase();
  });
}

/**
 * Convert context to database format for storage
 */
export function contextToDbFormat(context: StandardContext) {
  return {
    location_context: context.location,
    activity_context: context.activity,
    automatic_context: context.automatic,
  };
}

/**
 * Convert database format to standard context
 */
export function contextFromDbFormat(dbContext: {
  location_context?: string;
  activity_context?: string;
  automatic_context?: string;
}): StandardContext {
  return {
    location: dbContext.location_context,
    activity: dbContext.activity_context,
    automatic: dbContext.automatic_context,
  };
}

/**
 * Enhance context with location enrichment data
 */
export function enhanceContextWithLocation(
  context: StandardContext,
  enhancedLocation?: string
): StandardContext {
  if (!enhancedLocation) {
    return context;
  }

  // If we don't have a location context, use the enhanced one
  if (!context.location) {
    return {
      ...context,
      location: enhancedLocation
    };
  }

  // If we have a generic context, enhance it with more specific data
  if (context.location === 'Indoor' || context.location === 'Outdoor') {
    return {
      ...context,
      location: enhancedLocation
    };
  }

  // Keep existing specific context
  return context;
}

/**
 * Debug context flow for troubleshooting
 */
export function debugContext(
  component: string,
  context: StandardContext,
  source: string
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🏷️ [${component}] Context from ${source}:`, {
      location: context.location || 'none',
      activity: context.activity || 'none', 
      automatic: context.automatic || 'none'
    });
  }
}