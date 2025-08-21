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
    
    // Filter for CSV files and preserve full paths
    const csvFiles = (data || [])
      .filter(file => file.name.toLowerCase().endsWith('.csv'))
      .map(file => ({
        ...file,
        // Preserve full path for downloads
        fullPath: config.storage.pathPrefix + file.name,
        // Keep basename for logging
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

// Download a CSV file as Blob (for fingerprinting and non-destructive peek)
export async function downloadCSVBlob(filename: string): Promise<{ blob: Blob; fullPath: string; updatedAt: string } | null> {
  try {
    logger.debug('Downloading file as blob:', filename);
    
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
    
    logger.debug('File downloaded as blob:', { filename, size: data.size });
    return {
      blob: data,
      fullPath: filename,
      updatedAt: new Date().toISOString() // Blob doesn't have metadata, use current time
    };
    
  } catch (error) {
    logger.error('Error downloading CSV blob:', { filename, error });
    return null;
  }
}

// Convert Blob to Node.js Readable using Readable.fromWeb
export async function blobToNodeStream(blob: Blob): Promise<NodeJS.ReadableStream> {
  const { Readable } = await import('stream');
  const webStream = blob.stream();
  return Readable.fromWeb(webStream as any);
}

// Compute file fingerprint after download using fullPath, blob.size, and updatedAt
export function computeFileFingerprint(fullPath: string, blobSize: number, updatedAt: string): FileFingerprint {
  // Create a stable fingerprint from path, size, and timestamp
  const fingerprint = `${fullPath}:${blobSize}:${updatedAt}`;
  
  return {
    path: fullPath,
    size: blobSize,
    lastModified: updatedAt,
    fingerprint,
  };
}

// Legacy function - kept for backward compatibility
export async function downloadCSVFileAsStream(filename: string): Promise<NodeJS.ReadableStream | null> {
  const result = await downloadCSVBlob(filename);
  if (!result) return null;
  return blobToNodeStream(result.blob);
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