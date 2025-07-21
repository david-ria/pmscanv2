import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * 
 * Combines clsx for conditional classes and tailwind-merge to handle
 * conflicting Tailwind classes properly. This ensures that later classes
 * override earlier ones when they conflict.
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 * 
 * @example
 * cn('px-4 py-2', 'bg-primary', isActive && 'bg-secondary')
 * // Results in proper class merging with conflicting classes resolved
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number to a specified number of decimal places
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return Number(value).toFixed(decimals);
}

/**
 * Clamp a number between min and max values
 * 
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Debounce function to limit the rate of function calls
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
