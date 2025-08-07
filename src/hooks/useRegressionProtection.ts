import { useEffect, useCallback } from 'react';
import { regressionProtector, PROTECTED_FEATURES } from '@/utils/regressionProtection';
import { useToast } from '@/hooks/use-toast';
import * as logger from '@/utils/logger';

export function useRegressionProtection() {
  const { toast } = useToast();

  const runProtectionCheck = useCallback(async () => {
    const results = await regressionProtector.runProtectionTests();
    
    if (!results.passed) {
      toast({
        title: "⚠️ Regression Detected",
        description: `${results.failures.length} feature(s) may have been affected by recent changes.`,
        variant: "destructive",
      });
      
      logger.warn('🛡️ Regression protection triggered:', results.failures);
    }
    
    return results;
  }, [toast]);

  const validateCriticalPath = useCallback(async () => {
    const isValid = await regressionProtector.validateCriticalPath();
    
    if (!isValid) {
      toast({
        title: "🚨 Critical Path Broken",
        description: "Core functionality has been compromised. Check console for details.",
        variant: "destructive",
      });
      
      logger.error('🚨 Critical path validation failed');
    }
    
    return isValid;
  }, [toast]);

  // Auto-run protection checks when component mounts
  useEffect(() => {
    if (import.meta.env.DEV) {
      runProtectionCheck();
    }
  }, [runProtectionCheck]);

  return {
    runProtectionCheck,
    validateCriticalPath,
    getFeatureStatus: (feature: keyof typeof PROTECTED_FEATURES) => 
      regressionProtector.getFeatureStatus(PROTECTED_FEATURES[feature]),
  };
}