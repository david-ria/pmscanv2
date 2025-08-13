/**
 * Timestamp standardization utilities for migration and consistency checks
 * 
 * This module helps identify and fix timestamp inconsistencies across the app
 */

import { createTimestamp, ensureDate, formatDateTime, isValidTimestamp } from './timeFormat';
import * as logger from './logger';

interface TimestampIssue {
  location: string;
  issue: string;
  value: any;
  recommendation: string;
}

/**
 * Analyze an object for timestamp consistency issues
 */
export function analyzeTimestamps(obj: any, location: string = 'unknown'): TimestampIssue[] {
  const issues: TimestampIssue[] = [];
  
  function checkValue(value: any, path: string) {
    // Check for direct timestamp properties
    if (path.includes('timestamp') || path.includes('Time') || path.includes('date')) {
      if (value === null || value === undefined) {
        issues.push({
          location: `${location}.${path}`,
          issue: 'NULL_TIMESTAMP',
          value,
          recommendation: 'Use createTimestamp() for new timestamps'
        });
      } else if (typeof value === 'string') {
        // Check if it's a valid ISO string
        if (!isValidTimestamp(value)) {
          issues.push({
            location: `${location}.${path}`,
            issue: 'INVALID_TIMESTAMP_STRING',
            value,
            recommendation: 'Use ensureDate() to convert to Date object'
          });
        } else {
          // Valid string but should be Date object internally
          issues.push({
            location: `${location}.${path}`,
            issue: 'STRING_TIMESTAMP_SHOULD_BE_DATE',
            value,
            recommendation: 'Convert to Date object using ensureDate()'
          });
        }
      } else if (typeof value === 'number') {
        // Check if it's a valid timestamp
        if (value < 0 || value > Date.now() + 365 * 24 * 60 * 60 * 1000) { // Future limit: 1 year
          issues.push({
            location: `${location}.${path}`,
            issue: 'INVALID_TIMESTAMP_NUMBER',
            value,
            recommendation: 'Check timestamp value or use createTimestamp()'
          });
        } else {
          issues.push({
            location: `${location}.${path}`,
            issue: 'NUMBER_TIMESTAMP_SHOULD_BE_DATE',
            value,
            recommendation: 'Convert to Date object using ensureDate()'
          });
        }
      } else if (!(value instanceof Date)) {
        issues.push({
          location: `${location}.${path}`,
          issue: 'UNEXPECTED_TIMESTAMP_TYPE',
          value: typeof value,
          recommendation: 'Use ensureDate() to standardize to Date object'
        });
      } else if (isNaN(value.getTime())) {
        issues.push({
          location: `${location}.${path}`,
          issue: 'INVALID_DATE_OBJECT',
          value: value.toString(),
          recommendation: 'Replace with createTimestamp() or valid Date'
        });
      }
    }
    
    // Recursively check nested objects
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => checkValue(item, `${path}[${index}]`));
      } else {
        Object.keys(value).forEach(key => checkValue(value[key], `${path}.${key}`));
      }
    }
  }
  
  if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(key => checkValue(obj[key], key));
  }
  
  return issues;
}

/**
 * Fix common timestamp issues in an object
 */
export function standardizeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => standardizeTimestamps(item));
  }
  
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const fixed: any = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      // Handle timestamp-related properties
      if (key.includes('timestamp') || key.includes('Time') || key.includes('date')) {
        if (value !== null && value !== undefined) {
          try {
            fixed[key] = ensureDate(value);
          } catch (error) {
            logger.warn(`Failed to standardize timestamp ${key}:`, error);
            fixed[key] = createTimestamp(); // Fallback to current time
          }
        } else {
          fixed[key] = value; // Keep null/undefined as is
        }
      } else {
        // Recursively process nested objects
        fixed[key] = standardizeTimestamps(value);
      }
    });
    
    return fixed;
  }
  
  return obj;
}

/**
 * Generate a timestamp consistency report for debugging
 */
export function generateTimestampReport(data: any[], dataType: string): void {
  logger.debug(`📊 Timestamp Report for ${dataType}:`);
  
  let totalIssues = 0;
  const issueTypes = new Map<string, number>();
  
  data.forEach((item, index) => {
    const issues = analyzeTimestamps(item, `${dataType}[${index}]`);
    totalIssues += issues.length;
    
    issues.forEach(issue => {
      const count = issueTypes.get(issue.issue) || 0;
      issueTypes.set(issue.issue, count + 1);
      
      if (issues.length < 5) { // Only log details for first few issues
        logger.debug(`  ⚠️ ${issue.location}: ${issue.issue} - ${issue.recommendation}`);
      }
    });
  });
  
  logger.debug(`📈 Summary: ${totalIssues} issues found across ${data.length} items`);
  issueTypes.forEach((count, type) => {
    logger.debug(`  - ${type}: ${count} occurrences`);
  });
  
  if (totalIssues === 0) {
    logger.debug('✅ No timestamp issues found!');
  }
}

/**
 * Check localStorage for timestamp issues
 */
export function checkLocalStorageTimestamps(): void {
  logger.debug('🔍 Checking localStorage for timestamp issues...');
  
  const keysToCheck = [
    'pmscan_missions',
    'pmscan_recording_recovery',
    'pmscan_background_data'
  ];
  
  keysToCheck.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          generateTimestampReport(parsed, `localStorage.${key}`);
        } else if (typeof parsed === 'object') {
          const issues = analyzeTimestamps(parsed, `localStorage.${key}`);
          if (issues.length > 0) {
            logger.debug(`📋 Found ${issues.length} timestamp issues in ${key}`);
            issues.forEach(issue => {
              logger.debug(`  ⚠️ ${issue.location}: ${issue.issue}`);
            });
          }
        }
      }
    } catch (error) {
      logger.debug(`Error checking ${key}:`, error);
    }
  });
}

/**
 * Migration helper: convert all timestamp strings to Date objects in localStorage
 */
export function migrateLocalStorageTimestamps(): void {
  logger.debug('🔄 Migrating localStorage timestamps to Date objects...');
  
  const keysToMigrate = [
    'pmscan_missions',
    'pmscan_recording_recovery',
    'pmscan_background_data'
  ];
  
  keysToMigrate.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        const standardized = standardizeTimestamps(parsed);
        localStorage.setItem(key, JSON.stringify(standardized));
        logger.debug(`✅ Migrated timestamps in ${key}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to migrate ${key}:`, error);
    }
  });
  
  logger.debug('🎉 Timestamp migration completed');
}