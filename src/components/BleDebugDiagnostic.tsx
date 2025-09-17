import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DiagnosticResult {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

export function BleDebugDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    // Test 1: Check if bleDebugger can be imported
    try {
      const { bleDebugger } = await import('@/lib/bleDebug');
      diagnosticResults.push({
        component: 'BLE Debugger Import',
        status: 'ok',
        message: 'BLE debugger imported successfully'
      });

      // Test 2: Check if bleDebugger methods work
      try {
        const isEnabled = bleDebugger.isEnabled();
        diagnosticResults.push({
          component: 'BLE Debugger Methods',
          status: 'ok',
          message: `BLE debugger methods working (enabled: ${isEnabled})`
        });
      } catch (error) {
        diagnosticResults.push({
          component: 'BLE Debugger Methods',
          status: 'error',
          message: 'BLE debugger methods failing',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      diagnosticResults.push({
        component: 'BLE Debugger Import',
        status: 'error',
        message: 'Failed to import BLE debugger',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 3: Check if deviceLogger can be imported
    try {
      const { deviceLogger } = await import('@/services/deviceLogger');
      diagnosticResults.push({
        component: 'Device Logger Import',
        status: 'ok',
        message: 'Device logger imported successfully'
      });

      // Test 4: Check if deviceLogger methods work
      try {
        deviceLogger.log('info', 'ble', 'Diagnostic test log');
        const logs = deviceLogger.getLogs('ble');
        diagnosticResults.push({
          component: 'Device Logger Methods',
          status: 'ok',
          message: `Device logger methods working (${logs.length} logs)`
        });
      } catch (error) {
        diagnosticResults.push({
          component: 'Device Logger Methods',
          status: 'error',
          message: 'Device logger methods failing',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      diagnosticResults.push({
        component: 'Device Logger Import',
        status: 'error',
        message: 'Failed to import device logger',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 5: Check if connection manager can be imported
    try {
      const { globalConnectionManager } = await import('@/lib/pmscan/globalConnectionManager');
      diagnosticResults.push({
        component: 'Connection Manager Import',
        status: 'ok',
        message: 'Connection manager imported successfully'
      });

      // Test 6: Check connection manager state
      try {
        const isConnected = globalConnectionManager.isConnected();
        const isConnecting = globalConnectionManager.isConnecting();
        diagnosticResults.push({
          component: 'Connection Manager State',
          status: 'ok',
          message: `Connection manager working (connected: ${isConnected}, connecting: ${isConnecting})`
        });
      } catch (error) {
        diagnosticResults.push({
          component: 'Connection Manager State',
          status: 'error',
          message: 'Connection manager state check failed',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      diagnosticResults.push({
        component: 'Connection Manager Import',
        status: 'error',
        message: 'Failed to import connection manager',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 7: Check BLE client availability
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      diagnosticResults.push({
        component: 'BLE Client Import',
        status: 'ok',
        message: 'BLE client imported successfully'
      });

      // Test 8: Check BLE client initialization status
      try {
        // This is a basic check - we can't call initialize() multiple times
        if (typeof BleClient.initialize === 'function') {
          diagnosticResults.push({
            component: 'BLE Client Methods',
            status: 'ok',
            message: 'BLE client methods available'
          });
        } else {
          diagnosticResults.push({
            component: 'BLE Client Methods',
            status: 'warning',
            message: 'BLE client methods may not be available'
          });
        }
      } catch (error) {
        diagnosticResults.push({
          component: 'BLE Client Methods',
          status: 'error',
          message: 'BLE client method check failed',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      diagnosticResults.push({
        component: 'BLE Client Import',
        status: 'error',
        message: 'Failed to import BLE client',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      ok: 'default' as const,
      warning: 'secondary' as const,
      error: 'destructive' as const
    };

    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          BLE System Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostic} 
            disabled={isRunning}
            variant="outline"
          >
            {isRunning ? 'Running Diagnostic...' : 'Run BLE Diagnostic'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Diagnostic Results:</h4>
            {results.map((result, index) => (
              <Alert key={index} className="p-3">
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.component}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    <AlertDescription>{result.message}</AlertDescription>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground">
                          Show details
                        </summary>
                        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                          {result.details}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded">
            <h5 className="font-semibold mb-2">Summary:</h5>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600">
                ✓ {results.filter(r => r.status === 'ok').length} OK
              </span>
              <span className="text-yellow-600">
                ⚠ {results.filter(r => r.status === 'warning').length} Warnings
              </span>
              <span className="text-red-600">
                ✗ {results.filter(r => r.status === 'error').length} Errors
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}