/**
 * Centralized time formatting utilities to ensure consistency across the app
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
 * Format timestamp consistently for display
 */
export function formatTime(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString(DEFAULT_LOCALE, TIME_OPTIONS);
}

/**
 * Format date consistently for display
 */
export function formatDate(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleDateString(DEFAULT_LOCALE, DATE_OPTIONS);
}

/**
 * Format datetime consistently for display
 */
export function formatDateTime(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleString(DEFAULT_LOCALE, DATETIME_OPTIONS);
}

/**
 * Get ISO string for consistent API calls and storage
 */
export function toISOString(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toISOString();
}

/**
 * Create a standardized timestamp for recording
 */
export function createRecordingTimestamp(): Date {
  return new Date();
}

/**
 * Validate that a timestamp is valid
 */
export function isValidTimestamp(timestamp: Date | string): boolean {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Calculate duration between two timestamps in minutes
 */
export function calculateDurationMinutes(startTime: Date | string, endTime: Date | string): number {
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const end = endTime instanceof Date ? endTime : new Date(endTime);
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