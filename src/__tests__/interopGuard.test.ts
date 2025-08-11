/**
 * Interop guard test - ensures toISOString() only appears in allowed files
 */

import { describe, test, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('toISOString Interop Guard', () => {
  const allowedFiles = [
    'src/utils/timeFormat.ts',
    'src/utils/iso.ts', 
    'src/lib/csvExport.ts',
    'supabase/functions',
  ];

  const allowedPaths = allowedFiles.map(path => 
    path.startsWith('supabase/functions') ? path : join(process.cwd(), path)
  );

  function findFiles(dir: string, extension: string): string[] {
    const files: string[] = [];
    
    try {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...findFiles(fullPath, extension));
        } else if (stat.isFile() && item.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return files;
  }

  function isFileAllowed(filePath: string): boolean {
    return allowedPaths.some(allowedPath => {
      if (allowedPath.includes('supabase/functions')) {
        return filePath.includes('supabase/functions') && filePath.endsWith('.ts');
      }
      return filePath === allowedPath;
    });
  }

  test('toISOString() only appears in allowed files', () => {
    const srcFiles = findFiles(join(process.cwd(), 'src'), '.ts');
    const supabaseFunctionFiles = findFiles(join(process.cwd(), 'supabase/functions'), '.ts');
    const allFiles = [...srcFiles, ...supabaseFunctionFiles];
    
    const violations: { file: string; lines: number[] }[] = [];
    
    for (const file of allFiles) {
      // Skip test files
      if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
        continue;
      }
      
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const violatingLines: number[] = [];
        
        lines.forEach((line, index) => {
          if (line.includes('toISOString(') && !line.trim().startsWith('//')) {
            violatingLines.push(index + 1);
          }
        });
        
        if (violatingLines.length > 0 && !isFileAllowed(file)) {
          violations.push({
            file: file.replace(process.cwd(), ''),
            lines: violatingLines
          });
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    if (violations.length > 0) {
      const violationDetails = violations
        .map(v => `  ${v.file} (lines: ${v.lines.join(', ')})`)
        .join('\n');
      
      throw new Error(
        `toISOString() found in non-allowed files:\n${violationDetails}\n\n` +
        `Only allowed in: ${allowedFiles.join(', ')}\n` +
        `Use isoForInterop() from @/utils/iso for API interop instead.`
      );
    }
  });

  test('allowed files contain expected toISOString usage', () => {
    // Verify our allowed files actually contain toISOString (sanity check)
    const allowedFilesWithContent = [
      'src/utils/timeFormat.ts',
      'src/utils/iso.ts'
    ];
    
    let foundUsage = false;
    
    for (const file of allowedFilesWithContent) {
      const fullPath = join(process.cwd(), file);
      try {
        const content = readFileSync(fullPath, 'utf-8');
        if (content.includes('toISOString(')) {
          foundUsage = true;
          break;
        }
      } catch (error) {
        // File might not exist, skip
      }
    }
    
    expect(foundUsage).toBe(true);
  });
});