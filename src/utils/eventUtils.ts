/**
 * Event management utilities to ensure consistent timestamp and storage handling
 */

// Cooking event subtypes (internal classification)
export type CookSubtype2 = "cooking-boiling" | "cooking-frying";

export interface StandardEvent {
  id: string;
  missionId: string;
  eventType: string;
  comment?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  createdBy: string;
  timestamp: Date; // Always use Date objects internally
}

// Enhanced cooking event interface (internal use only - no CSV export impact)
export interface CookingEvent extends StandardEvent {
  eventType: "cooking";
  // Internal enrichment fields (not exported to CSV)
  subtype?: CookSubtype2;
  confidence?: number;
  lowConfidence?: boolean;
  scoreMax?: number;
  start?: number;
  end?: number;
}

export interface EventStorageFormat {
  id: string;
  mission_id: string;
  event_type: string;
  comment?: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  created_by: string;
  timestamp: string; // ISO string for storage
}

/**
 * Normalize event data from various sources
 */
export function normalizeEvent(event: any): StandardEvent {
  // Ensure timestamp is always a Date object
  let timestamp: Date;
  if (event.timestamp instanceof Date) {
    timestamp = event.timestamp;
  } else if (typeof event.timestamp === 'string') {
    timestamp = new Date(event.timestamp);
  } else {
    timestamp = new Date();
  }

  return {
    id: event.id || crypto.randomUUID(),
    missionId: event.mission_id || event.missionId,
    eventType: event.event_type || event.eventType,
    comment: event.comment,
    photoUrl: event.photo_url || event.photoUrl,
    latitude: event.latitude,
    longitude: event.longitude,
    accuracy: event.accuracy,
    createdBy: event.created_by || event.createdBy,
    timestamp
  };
}

/**
 * Normalize cooking event data (internal enrichment preserved)
 */
export function normalizeCookingEvent(event: any): CookingEvent {
  const baseEvent = normalizeEvent(event) as CookingEvent;
  
  // Preserve internal cooking-specific fields if present
  if (event.subtype) baseEvent.subtype = event.subtype;
  if (event.confidence !== undefined) baseEvent.confidence = event.confidence;
  if (event.lowConfidence !== undefined) baseEvent.lowConfidence = event.lowConfidence;
  if (event.scoreMax !== undefined) baseEvent.scoreMax = event.scoreMax;
  if (event.start !== undefined) baseEvent.start = event.start;
  if (event.end !== undefined) baseEvent.end = event.end;
  
  return baseEvent;
}

/**
 * Convert event to storage format
 */
export function eventToStorageFormat(event: StandardEvent): EventStorageFormat {
  return {
    id: event.id,
    mission_id: event.missionId,
    event_type: event.eventType,
    comment: event.comment,
    photo_url: event.photoUrl,
    latitude: event.latitude,
    longitude: event.longitude,
    accuracy: event.accuracy,
    created_by: event.createdBy,
    timestamp: event.timestamp.toISOString()
  };
}

/**
 * Convert storage format to standard event
 */
export function eventFromStorageFormat(stored: EventStorageFormat): StandardEvent {
  return {
    id: stored.id,
    missionId: stored.mission_id,
    eventType: stored.event_type,
    comment: stored.comment,
    photoUrl: stored.photo_url,
    latitude: stored.latitude,
    longitude: stored.longitude,
    accuracy: stored.accuracy,
    createdBy: stored.created_by,
    timestamp: new Date(stored.timestamp)
  };
}

/**
 * Sort events by timestamp (chronological order)
 */
export function sortEventsByTimestamp(events: StandardEvent[]): StandardEvent[] {
  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Find events within time range
 */
export function getEventsInTimeRange(
  events: StandardEvent[],
  startTime: Date,
  endTime: Date
): StandardEvent[] {
  return events.filter(event => {
    const eventTime = event.timestamp.getTime();
    return eventTime >= startTime.getTime() && eventTime <= endTime.getTime();
  });
}

/**
 * Validate event data before storage
 */
export function validateEvent(event: Partial<StandardEvent>): string[] {
  const errors: string[] = [];
  
  if (!event.missionId) {
    errors.push('Mission ID is required');
  }
  
  if (!event.eventType) {
    errors.push('Event type is required');
  }
  
  if (!event.createdBy) {
    errors.push('Created by user ID is required');
  }
  
  if (!event.timestamp || isNaN(event.timestamp.getTime())) {
    errors.push('Valid timestamp is required');
  }
  
  return errors;
}

/**
 * Helper function to check if an event is a cooking event
 */
export function isCookingEvent(event: StandardEvent): event is CookingEvent {
  return event.eventType === 'cooking';
}

/**
 * Helper function to safely cast to cooking event with validation
 */
export function asCookingEvent(event: StandardEvent): CookingEvent | null {
  if (!isCookingEvent(event)) {
    return null;
  }
  return event;
}