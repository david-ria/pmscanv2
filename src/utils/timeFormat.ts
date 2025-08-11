/**
 * Display-only time formatting utilities
 * Consumes numeric epoch ms and never persists Date objects
 */

import { toEpochMs } from '@/lib/time';

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
 * Strict guard to ensure numeric epoch timestamp
 */
export function ensureEpochMs(input: number | Date | string): number {
  return toEpochMs(input);
}

/**
 * Format timestamp consistently for display
 */
export function formatTime(timestamp: number | Date | string, timeZone?: string): string {
  const epochMs = ensureEpochMs(timestamp);
  const options = timeZone ? { ...TIME_OPTIONS, timeZone } : TIME_OPTIONS;
  return new Date(epochMs).toLocaleTimeString(DEFAULT_LOCALE, options);
}

/**
 * Format date consistently for display
 */
export function formatDate(timestamp: number | Date | string, timeZone?: string): string {
  const epochMs = ensureEpochMs(timestamp);
  const options = timeZone ? { ...DATE_OPTIONS, timeZone } : DATE_OPTIONS;
  return new Date(epochMs).toLocaleDateString(DEFAULT_LOCALE, options);
}

/**
 * Format datetime consistently for display
 */
export function formatDateTime(timestamp: number | Date | string, timeZone?: string): string {
  const epochMs = ensureEpochMs(timestamp);
  const options = timeZone ? { ...DATETIME_OPTIONS, timeZone } : DATETIME_OPTIONS;
  return new Date(epochMs).toLocaleString(DEFAULT_LOCALE, options);
}

/**
 * Get ISO string for consistent API calls and storage
 */
export function toISOString(timestamp: number | Date | string): string {
  const epochMs = ensureEpochMs(timestamp);
  return new Date(epochMs).toISOString();
}

/**
 * Validate that a timestamp is valid
 */
export function isValidTimestamp(timestamp: number | Date | string): boolean {
  try {
    const epochMs = ensureEpochMs(timestamp);
    return !isNaN(epochMs) && isFinite(epochMs);
  } catch {
    return false;
  }
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

/**
 * Format duration in 00h00m format
 */
export function formatDurationHHMM(minutes: number): string {
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}h${mins.toString().padStart(2, '0')}m`;
}