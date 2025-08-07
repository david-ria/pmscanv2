import { useEffect, useState } from 'react';
import { regressionProtector, PROTECTED_FEATURES } from '@/utils/regressionProtection';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import * as logger from '@/utils/logger';

export function RegressionMonitor() {
  const [testResults, setTestResults] = useState<{ passed: boolean; failures: string[] } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const runTests = async () => {
      // Only run in development or when explicitly enabled
      if (import.meta.env.DEV || localStorage.getItem('enable_regression_monitor') === 'true') {
        const results = await regressionProtector.runProtectionTests();
        setTestResults(results);
        
        // Show monitor if there are failures
        if (!results.passed) {
          setIsVisible(true);
          logger.warn('🛡️ Regression Monitor detected issues');
        }
      }
    };

    // Run tests on mount and periodically
    runTests();
    const interval = setInterval(runTests, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Don't render in production unless explicitly enabled
  if (!import.meta.env.DEV && localStorage.getItem('enable_regression_monitor') !== 'true') {
    return null;
  }

  if (!isVisible || !testResults) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className={testResults.passed ? "border-green-500" : "border-red-500"}>
        <div className="flex items-center gap-2">
          {testResults.passed ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          <span className="font-medium">
            {testResults.passed ? 'All Systems OK' : 'Regression Detected'}
          </span>
          <button
            onClick={() => setIsVisible(false)}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
        
        {!testResults.passed && (
          <AlertDescription className="mt-2">
            <div className="text-sm">
              <strong>Failed checks:</strong>
              <ul className="mt-1 space-y-1">
                {testResults.failures.map((failure, index) => (
                  <li key={index} className="text-xs">• {failure}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        )}
      </Alert>
    </div>
  );
}