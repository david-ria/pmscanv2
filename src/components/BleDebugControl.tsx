import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Eye, EyeOff, Settings } from 'lucide-react';
import { safeBleDebugger, type BlePhase } from '@/lib/bleSafeWrapper';
import { toast } from 'sonner';

const BLE_PHASES: BlePhase[] = ['INIT', 'SCAN', 'CONNECT', 'NOTIFY', 'DISCONNECT', 'MTU', 'CHARS', 'SERVICE'];

export function BleDebugControl() {
  const [isEnabled, setIsEnabled] = useState(safeBleDebugger.isEnabled());
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsEnabled(safeBleDebugger.isEnabled());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleToggle = (enabled: boolean) => {
    safeBleDebugger.setEnabled(enabled);
    setIsEnabled(enabled);
    
    if (enabled) {
      toast.success('BLE Debug Mode enabled', {
        description: 'Detailed BLE logs will now be captured'
      });
    } else {
      toast.info('BLE Debug Mode disabled');
    }
  };

  const handleExportLogs = () => {
    try {
      const logs = safeBleDebugger.exportDebugLogs();
      const blob = new Blob([logs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pmscan-ble-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Debug logs exported successfully');
    } catch (error) {
      toast.error('Failed to export debug logs');
    }
  };

  const diagnostics = showDiagnostics ? safeBleDebugger.getDiagnostics() : '';

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          BLE Debug Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Debug Mode</div>
            <div className="text-xs text-muted-foreground">
              Capture detailed BLE operation logs
            </div>
          </div>
          <Switch 
            checked={isEnabled} 
            onCheckedChange={handleToggle}
          />
        </div>

        {isEnabled && (
          <>
            <Separator />
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Active Phases</div>
              <div className="flex flex-wrap gap-1">
                {BLE_PHASES.map((phase) => (
                  <Badge 
                    key={phase}
                    variant={safeBleDebugger.isPhaseEnabled(phase) ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {phase}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportLogs}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Debug Logs
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="flex items-center gap-2"
              >
                {showDiagnostics ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
              </Button>
            </div>

            {showDiagnostics && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium">Diagnostics</div>
                  <ScrollArea className="h-40 w-full rounded border">
                    <pre className="p-3 text-xs whitespace-pre-wrap font-mono">
                      {diagnostics}
                    </pre>
                  </ScrollArea>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}