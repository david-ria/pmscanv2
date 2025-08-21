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

// List CSV files in the storage bucket, client-side sorted by updated_at (oldest→newest)
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
        // No server-side sorting - we'll sort client-side for reliability
      });
    
    if (error) {
      logger.error('Error listing files:', error);
      return [];
    }
    
    // Filter for CSV files and add full paths (no size filtering)
    const csvFiles = (data || [])
      .filter(file => {
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        return isCSV; // Don't filter on size - let empty files through for processing
      })
      .map(file => ({
        ...file,
        // Ensure we have the full path for downloads
        name: config.storage.pathPrefix + file.name,
        // Extract just the basename for logging
        basename: file.name,
      })) as StorageFile[];
    
    // Client-side sort by updated_at (oldest→newest) for reliable processing order
    csvFiles.sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at).getTime();
      const timeB = new Date(b.updated_at || b.created_at).getTime();
      return timeA - timeB; // oldest first
    });
    
    logger.info(`Found ${csvFiles.length} CSV files (client-sorted oldest→newest by updated_at)`);
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

// Download a CSV file as Node.js Readable (memory-efficient streaming)
export async function downloadCSVFileAsStream(filename: string): Promise<NodeJS.ReadableStream | null> {
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
    
    // Convert Web ReadableStream to Node.js Readable
    const webStream = data.stream();
    const reader = webStream.getReader();
    
    const { Readable } = await import('stream');
    
    const nodeReadable = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null); // End of stream
          } else {
            this.push(Buffer.from(value));
          }
        } catch (error) {
          this.destroy(error as Error);
        }
      }
    });
    
    return nodeReadable;
    
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

// Extract device ID from filename with CSV content fallback
export async function extractDeviceIdFromFilename(filename: string, csvContent?: string): Promise<string | null> {
  try {
    // Primary: Extract from filename pattern "device123_mission_2025-07-30_12-34-45.csv"
    const basename = filename.replace(config.storage.pathPrefix, '').replace('.csv', '');
    const parts = basename.split('_');
    
    if (parts.length > 0) {
      const deviceId = parts[0];
      // Validate device ID format (basic check)
      if (deviceId && deviceId.length > 0 && !deviceId.includes('.')) {
        logger.debug('Extracted device ID from filename:', { filename, deviceId });
        return deviceId;
      }
    }
    
    // Fallback: Look for device ID in CSV content header/first few rows
    if (csvContent) {
      logger.debug('Attempting CSV content fallback for device ID:', filename);
      
      // Look for device ID patterns in CSV headers or first few lines
      const lines = csvContent.split('\n').slice(0, 5); // Check first 5 lines
      
      for (const line of lines) {
        // Look for patterns like "Device: device123" or "DeviceID,device456"
        const deviceMatches = line.match(/device[_\s]*(?:id)?[:\s,=]+([a-zA-Z0-9_-]+)/i);
        if (deviceMatches && deviceMatches[1]) {
          const deviceId = deviceMatches[1];
          logger.info('Found device ID in CSV content:', { filename, deviceId, line: line.substring(0, 50) });
          return deviceId;
        }
        
        // Look for common CSV metadata patterns
        const metadataMatches = line.match(/([a-zA-Z0-9_-]+).*sensor|([a-zA-Z0-9_-]+).*pmscan/i);
        if (metadataMatches) {
          const deviceId = metadataMatches[1] || metadataMatches[2];
          if (deviceId && deviceId.length > 2) {
            logger.info('Found device ID from sensor metadata:', { filename, deviceId });
            return deviceId;
          }
        }
      }
    }
    
    logger.warn('Could not extract device ID from filename or CSV content:', filename);
    return null;
    
  } catch (error) {
    logger.error('Error extracting device ID:', { filename, error });
    return null;
  }
}