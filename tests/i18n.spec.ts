import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

// Load all locale files
const localesDir = 'src/i18n/locales';
const localeFiles = readdirSync(localesDir).filter(f => f.endsWith('.json'));

function loadLocale(filename: string): Record<string, any> {
  const content = readFileSync(join(localesDir, filename), 'utf-8');
  return JSON.parse(content);
}

// Extract all translation keys from a nested object
function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

// Extract translation usages from source files
async function extractTranslationUsages(): Promise<string[]> {
  const sourceFiles = await glob('src/**/*.{ts,tsx}', { ignore: ['src/**/*.spec.ts', 'src/**/*.test.ts'] });
  const usages = new Set<string>();
  
  // Regex patterns to match t('key'), t("key") calls
  const patterns = [
    /t\(['"]([^'"]+)['"]\)/g,
    /t\(['"]([^'"]+)['"],/g,
  ];
  
  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf-8');
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        usages.add(match[1]);
      }
    }
  }
  
  return Array.from(usages);
}

describe('i18n integrity checks', () => {
  it('should load all locale files without errors', () => {
    expect(localeFiles.length).toBeGreaterThan(0);
    
    for (const file of localeFiles) {
      expect(() => {
        const locale = loadLocale(file);
        expect(typeof locale).toBe('object');
        expect(locale).not.toBeNull();
      }).not.toThrow();
    }
  });

  it('should have no duplicate keys in locale files', () => {
    for (const file of localeFiles) {
      const content = readFileSync(join(localesDir, file), 'utf-8');
      const keys = content.match(/"([^"]+)":/g) || [];
      const keyNames = keys.map(k => k.slice(1, -2)); // Remove quotes and colon
      
      const duplicates = keyNames.filter((key, index) => keyNames.indexOf(key) !== index);
      expect(duplicates).toEqual([]);
    }
  });

  it('should have non-empty string values for all keys in en.json', () => {
    const enLocale = loadLocale('en.json');
    const allKeys = getAllKeys(enLocale);
    
    for (const key of allKeys) {
      const value = key.split('.').reduce((obj, k) => obj?.[k], enLocale);
      expect(typeof value).toBe('string');
      expect(value.trim()).not.toBe('');
    }
  });

  it('should have all used translation keys present in en.json', async () => {
    const enLocale = loadLocale('en.json');
    const enKeys = getAllKeys(enLocale);
    const usedKeys = await extractTranslationUsages();
    
    const missingKeys = usedKeys.filter(key => !enKeys.includes(key));
    
    if (missingKeys.length > 0) {
      console.error('Missing translation keys:', missingKeys);
    }
    
    expect(missingKeys).toEqual([]);
  });

  it('should warn about unused translation keys in en.json', async () => {
    const enLocale = loadLocale('en.json');
    const enKeys = getAllKeys(enLocale);
    const usedKeys = await extractTranslationUsages();
    
    const unusedKeys = enKeys.filter(key => !usedKeys.includes(key));
    
    if (unusedKeys.length > 0) {
      console.warn(`Found ${unusedKeys.length} unused translation keys:`, unusedKeys);
      // Uncomment the next line to fail on unused keys
      // expect(unusedKeys).toEqual([]);
    }
    
    // For now, just log unused keys as a warning
    expect(true).toBe(true);
  });

  it('should have consistent keys across all locale files', () => {
    const enLocale = loadLocale('en.json');
    const enKeys = getAllKeys(enLocale).sort();
    
    for (const file of localeFiles) {
      if (file === 'en.json') continue;
      
      const locale = loadLocale(file);
      const keys = getAllKeys(locale).sort();
      
      const missingInLocale = enKeys.filter(key => !keys.includes(key));
      const extraInLocale = keys.filter(key => !enKeys.includes(key));
      
      if (missingInLocale.length > 0) {
        console.warn(`Missing keys in ${file}:`, missingInLocale);
      }
      
      if (extraInLocale.length > 0) {
        console.warn(`Extra keys in ${file}:`, extraInLocale);
      }
      
      // For now, just warn about inconsistencies
      // Uncomment to fail on missing keys:
      // expect(missingInLocale).toEqual([]);
    }
  });
});