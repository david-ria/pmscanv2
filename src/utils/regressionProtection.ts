/**
 * Regression Protection Utilities
 * Helps identify and protect critical app functionality from unintended changes
 */

import * as logger from '@/utils/logger';

// Core features that should be protected from regression
export const PROTECTED_FEATURES = {
  RECORDING: 'recording',
  BLUETOOTH_CONNECTION: 'bluetooth_connection',
  DATA_PERSISTENCE: 'data_persistence',
  NAVIGATION: 'navigation',
  AUTHENTICATION: 'authentication'
} as const;

type ProtectedFeature = typeof PROTECTED_FEATURES[keyof typeof PROTECTED_FEATURES];

interface FeatureTest {
  name: string;
  feature: ProtectedFeature;
  test: () => Promise<boolean> | boolean;
  critical: boolean;
}

class RegressionProtector {
  private tests: FeatureTest[] = [];
  private lastKnownGoodState: Map<ProtectedFeature, boolean> = new Map();

  registerTest(test: FeatureTest) {
    this.tests.push(test);
    logger.debug(`🛡️ Registered protection test: ${test.name}`);
  }

  async runProtectionTests(): Promise<{ passed: boolean; failures: string[] }> {
    const failures: string[] = [];
    
    for (const test of this.tests) {
      try {
        const result = await test.test();
        
        if (!result) {
          failures.push(`${test.name} (${test.feature})`);
          if (test.critical) {
            logger.error(`🚨 CRITICAL REGRESSION: ${test.name} failed`);
          } else {
            logger.warn(`⚠️ Regression detected: ${test.name} failed`);
          }
        } else {
          this.lastKnownGoodState.set(test.feature, true);
        }
      } catch (error) {
        failures.push(`${test.name} (error: ${error})`);
        logger.error(`🚨 Test execution failed: ${test.name}`, error);
      }
    }

    const passed = failures.length === 0;
    
    if (passed) {
      logger.debug('✅ All regression protection tests passed');
    } else {
      logger.warn('❌ Regression protection failures:', failures);
    }

    return { passed, failures };
  }

  getFeatureStatus(feature: ProtectedFeature): boolean | undefined {
    return this.lastKnownGoodState.get(feature);
  }

  async validateCriticalPath(): Promise<boolean> {
    const criticalTests = this.tests.filter(test => test.critical);
    
    for (const test of criticalTests) {
      try {
        const result = await test.test();
        if (!result) {
          logger.error(`🚨 CRITICAL PATH BROKEN: ${test.name}`);
          return false;
        }
      } catch (error) {
        logger.error(`🚨 CRITICAL PATH ERROR: ${test.name}`, error);
        return false;
      }
    }

    return true;
  }
}

export const regressionProtector = new RegressionProtector();

// Auto-register core feature tests
regressionProtector.registerTest({
  name: 'Recording Service Available',
  feature: PROTECTED_FEATURES.RECORDING,
  test: () => {
    try {
      const { recordingService } = require('@/services/recordingService');
      return recordingService && typeof recordingService.getState === 'function';
    } catch {
      return false;
    }
  },
  critical: true
});

regressionProtector.registerTest({
  name: 'Local Storage Access',
  feature: PROTECTED_FEATURES.DATA_PERSISTENCE,
  test: () => {
    try {
      localStorage.setItem('regression_test', 'test');
      const result = localStorage.getItem('regression_test') === 'test';
      localStorage.removeItem('regression_test');
      return result;
    } catch {
      return false;
    }
  },
  critical: true
});

regressionProtector.registerTest({
  name: 'React Router Available',
  feature: PROTECTED_FEATURES.NAVIGATION,
  test: () => {
    try {
      return typeof window !== 'undefined' && 
             window.location && 
             document.querySelector('[data-testid]') !== null;
    } catch {
      return false;
    }
  },
  critical: false
});