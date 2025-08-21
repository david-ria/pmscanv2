import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { createLogger } from './logger.js';
import type { StorageFile, FileFingerprint } from './types.js';

const logger = createLogger('supabase');

// Initialize Supabase client with read-only credentials (SUPABASE_KEY from env)
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Test Supabase connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(config.storage.bucket)
      .list('', { limit: 1 });
    
    if (error) {
      logger.error('Supabase connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Supabase connection test failed:', error);
    return false;
  }
}

// List CSV files in the storage bucket, sorted oldest to newest
export async function listCSVFiles(): Promise<StorageFile[]> {
  try {
    logger.debug('Listing CSV files from bucket:', { 
      bucket: config.storage.bucket, 
      prefix: config.storage.pathPrefix 
    });
    
    const { data, error } = await supabase.storage
      .from(config.storage.bucket)
      .list(config.storage.pathPrefix, {
        limit: 1000, // Adjust based on your needs
        sortBy: { column: 'created_at', order: 'asc' }, // OLDEST to NEWEST for processing order
      });
    
    if (error) {
      logger.error('Error listing files:', error);
      return [];
    }
    
    // Filter for CSV files only and add full paths
    const csvFiles = (data || [])
      .filter(file => {
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        const hasSize = file.metadata?.size > 0;
        return isCSV && hasSize; // Only include non-empty CSV files
      })
      .map(file => ({
        ...file,
        // Ensure we have the full path for downloads
        name: config.storage.pathPrefix + file.name,
        // Extract just the basename for logging
        basename: file.name,
      })) as StorageFile[];
    
    logger.info(`Found ${csvFiles.length} CSV files (sorted oldest→newest)`);
    return csvFiles;
    
  } catch (error) {
    logger.error('Error listing CSV files:', error);
    return [];
  }
}

// Compute file fingerprint for idempotency (path + size + lastModified)
export function computeFileFingerprint(file: StorageFile): FileFingerprint {
  const path = file.name;
  const size = file.metadata?.size || 0;
  const lastModified = file.updated_at || file.created_at;
  
  // Create a stable fingerprint from path, size, and timestamp
  const fingerprint = `${path}:${size}:${lastModified}`;
  
  return {
    path,
    size,
    lastModified,
    fingerprint,
  };
}

// Download a CSV file as a ReadableStream (memory-efficient streaming)
export async function downloadCSVFileAsStream(filename: string): Promise<ReadableStream<Uint8Array> | null> {
  try {
    logger.debug('Downloading file as stream:', filename);
    
    const { data, error } = await supabase.storage
      .from(config.storage.bucket)
      .download(filename);
    
    if (error) {
      logger.error('Error downloading file:', { filename, error });
      return null;
    }
    
    if (!data) {
      logger.warn('No data returned for file:', filename);
      return null;
    }
    
    // Get file size for logging
    const fileSize = data.size;
    logger.debug('File downloaded successfully:', { filename, size: fileSize });
    
    // Convert Blob to ReadableStream for memory-efficient processing
    return data.stream();
    
  } catch (error) {
    logger.error('Error downloading CSV file:', { filename, error });
    return null;
  }
}

// Alternative: Download as Buffer (less memory-efficient, but sometimes needed)
export async function downloadCSVFileAsBuffer(filename: string): Promise<Buffer | null> {
  try {
    logger.debug('Downloading file as buffer:', filename);
    
    const { data, error } = await supabase.storage
      .from(config.storage.bucket)
      .download(filename);
    
    if (error) {
      logger.error('Error downloading file:', { filename, error });
      return null;
    }
    
    if (!data) {
      logger.warn('No data returned for file:', filename);
      return null;
    }
    
    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    logger.debug('File downloaded as buffer:', { filename, size: buffer.length });
    return buffer;
    
  } catch (error) {
    logger.error('Error downloading CSV file as buffer:', { filename, error });
    return null;
  }
}

// Extract device ID from filename
// Assumes filename format like: "device123_mission_2025-07-30_12-34-45.csv"
export function extractDeviceIdFromFilename(filename: string): string | null {
  try {
    // Remove path prefix and extension
    const basename = filename.replace(config.storage.pathPrefix, '').replace('.csv', '');
    
    // Extract device ID (assumes it's the first part before underscore)
    const parts = basename.split('_');
    if (parts.length > 0) {
      const deviceId = parts[0];
      logger.debug('Extracted device ID:', { filename, deviceId });
      return deviceId;
    }
    
    logger.warn('Could not extract device ID from filename:', filename);
    return null;
  } catch (error) {
    logger.error('Error extracting device ID:', { filename, error });
    return null;
  }
}