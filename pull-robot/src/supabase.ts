import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { createLogger } from './logger.js';
import type { StorageFile } from './types.js';

const logger = createLogger('supabase');

// Initialize Supabase client with read-only credentials
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

// List CSV files in the storage bucket
export async function listCSVFiles(): Promise<StorageFile[]> {
  try {
    const { data, error } = await supabase.storage
      .from(config.storage.bucket)
      .list(config.storage.pathPrefix, {
        limit: 1000, // Adjust based on your needs
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) {
      logger.error('Error listing files:', error);
      return [];
    }
    
    // Filter for CSV files only
    const csvFiles = (data || [])
      .filter(file => file.name.toLowerCase().endsWith('.csv'))
      .map(file => ({
        ...file,
        // Ensure we have the full path
        name: config.storage.pathPrefix + file.name,
      })) as StorageFile[];
    
    logger.debug(`Found ${csvFiles.length} CSV files`);
    return csvFiles;
    
  } catch (error) {
    logger.error('Error listing CSV files:', error);
    return [];
  }
}

// Download a CSV file as a stream
export async function downloadCSVFile(filename: string): Promise<ReadableStream<Uint8Array> | null> {
  try {
    logger.debug('Downloading file:', filename);
    
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
    
    // Convert Blob to ReadableStream
    const stream = data.stream();
    logger.debug('File downloaded successfully:', filename);
    return stream;
    
  } catch (error) {
    logger.error('Error downloading CSV file:', { filename, error });
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

// Get file metadata
export async function getFileMetadata(filename: string): Promise<any> {
  try {
    const { data, error } = await supabase.storage
      .from(config.storage.bucket)
      .list(config.storage.pathPrefix, {
        search: filename.replace(config.storage.pathPrefix, '')
      });
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    return data[0];
  } catch (error) {
    logger.error('Error getting file metadata:', { filename, error });
    return null;
  }
}