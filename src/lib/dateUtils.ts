/**
 * Optimized date-fns imports using ESM modules for better tree shaking
 * This file provides centralized date utilities with minimal bundle impact
 */

// Individual ESM imports for optimal tree shaking
export { format } from 'date-fns/format';
export { parseISO } from 'date-fns/parseISO';
export { subDays } from 'date-fns/subDays';
export { startOfDay } from 'date-fns/startOfDay';
export { endOfDay } from 'date-fns/endOfDay';
export { isAfter } from 'date-fns/isAfter';
export { isBefore } from 'date-fns/isBefore';
export { differenceInHours } from 'date-fns/differenceInHours';
export { differenceInMinutes } from 'date-fns/differenceInMinutes';
export { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
export { startOfWeek } from 'date-fns/startOfWeek';
export { endOfWeek } from 'date-fns/endOfWeek';
export { startOfMonth } from 'date-fns/startOfMonth';
export { endOfMonth } from 'date-fns/endOfMonth';
export { startOfYear } from 'date-fns/startOfYear';
export { endOfYear } from 'date-fns/endOfYear';
export { isSameDay } from 'date-fns/isSameDay';

// Locale imports - only what we need
export { fr } from 'date-fns/locale/fr';
export { enUS } from 'date-fns/locale/en-US';

// Common date formatting utilities
export const formatDate = (date: Date | string, formatString: string = 'PPP') => {
  const { format } = require('date-fns/format');
  const { parseISO } = require('date-fns/parseISO');
  return format(typeof date === 'string' ? parseISO(date) : date, formatString);
};

export const formatDateTime = (date: Date | string) => {
  const { format } = require('date-fns/format');
  const { parseISO } = require('date-fns/parseISO');
  return format(typeof date === 'string' ? parseISO(date) : date, 'PPp');
};

export const formatRelativeTime = (date: Date | string) => {
  const { formatDistanceToNow } = require('date-fns/formatDistanceToNow');
  const { parseISO } = require('date-fns/parseISO');
  return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, { addSuffix: true });
};

// Helper to get locale based on current language
export const getDateLocale = () => {
  const currentLang = localStorage.getItem('i18nextLng') || 'en';
  switch (currentLang) {
    case 'fr':
      return require('date-fns/locale/fr').fr;
    default:
      return require('date-fns/locale/en-US').enUS;
  }
};