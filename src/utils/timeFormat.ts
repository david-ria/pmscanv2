/**
 * =======================================
 * UNIFIED TIME REFERENCE STRATEGY
 * =======================================
 * 
 * SINGLE SOURCE OF TRUTH: createTimestamp()
 * - PMScan data parser uses this for device data
 * - Recording service preserves original timestamps
 * - All components use same time reference
 * - No timestamp overwriting in data flow
 * 
 * STANDARDS:
 * - Always use Date objects internally
 * - Use ISO strings for storage/API calls  
 * - Use consistent locale formatting for display
 * - Smartphone time for recording (more accurate than device)
 */

// Default locale and timezone configuration
const DEFAULT_LOCALE = 'fr-FR';
const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

const DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DATE_OPTIONS,
  ...TIME_OPTIONS,
};

/**
 * SINGLE SOURCE OF TRUTH: Create timestamp for ALL components
 * This is the ONLY function that should create new timestamps
 */
export function createTimestamp(): Date {
  return new Date();
}

/**
 * Ensure a value is a valid Date object
 */
export function ensureDate(timestamp: Date | string | number): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp provided:', timestamp);
      return new Date(); // Fallback to current time
    }
    return date;
  }
  console.warn('Invalid timestamp type:', typeof timestamp, timestamp);
  return new Date(); // Fallback to current time
}

/**
 * Format timestamp consistently for display
 */
export function formatTime(timestamp: Date | string | number): string {
  const date = ensureDate(timestamp);
  return date.toLocaleTimeString(DEFAULT_LOCALE, TIME_OPTIONS);
}

/**
 * Format date consistently for display
 */
export function formatDate(timestamp: Date | string | number): string {
  const date = ensureDate(timestamp);
  return date.toLocaleDateString(DEFAULT_LOCALE, DATE_OPTIONS);
}

/**
 * Format datetime consistently for display
 */
export function formatDateTime(timestamp: Date | string | number): string {
  const date = ensureDate(timestamp);
  return date.toLocaleString(DEFAULT_LOCALE, DATETIME_OPTIONS);
}

/**
 * Get ISO string for consistent API calls and storage
 */
export function toISOString(timestamp: Date | string | number): string {
  const date = ensureDate(timestamp);
  return date.toISOString();
}

/**
 * Create a standardized timestamp for recording
 * @deprecated Use createTimestamp() instead
 */
export function createRecordingTimestamp(): Date {
  return createTimestamp();
}

/**
 * Validate that a timestamp is valid
 */
export function isValidTimestamp(timestamp: Date | string | number): boolean {
  const date = ensureDate(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Calculate duration between two timestamps in minutes
 */
export function calculateDurationMinutes(startTime: Date | string | number, endTime: Date | string | number): number {
  const start = ensureDate(startTime);
  const end = ensureDate(endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Format duration in a human-readable format
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins} min`;
}

/**
 * Format duration in 00h00m format
 */
export function formatDurationHHMM(minutes: number): string {
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}h${mins.toString().padStart(2, '0')}m`;
}