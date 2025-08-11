/**
 * ISO string utilities for API interop ONLY
 * 
 * WARNING: Never use for app storage or graph data - always store epoch ms numbers
 * Only use for external APIs, file exports, and debugging
 */

/**
 * Convert epoch milliseconds to ISO string for API interop ONLY
 * 
 * @param epochMs - Numeric epoch milliseconds
 * @returns ISO string for external APIs/files only
 */
export function isoForInterop(epochMs: number): string {
  // Interop ONLY: never use for app storage or graph data
  return new Date(epochMs).toISOString();
}

/**
 * Generate ISO timestamp for filename usage
 * 
 * @param epochMs - Numeric epoch milliseconds  
 * @returns Safe filename timestamp
 */
export function isoForFilename(epochMs: number): string {
  return isoForInterop(epochMs).replace(/[:.]/g, '-').slice(0, -5); // Remove milliseconds and 'Z'
}