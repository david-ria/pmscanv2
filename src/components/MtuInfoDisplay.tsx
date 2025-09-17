import { useEffect, useState } from 'react';
import { MtuManager, type MtuInfo } from '@/lib/pmscan/mtuManager';
import { MtuMonitorService } from '@/services/mtuMonitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Wifi, Zap, TrendingUp } from 'lucide-react';

interface MtuInfoDisplayProps {
  isConnected: boolean;
}

export function MtuInfoDisplay({ isConnected }: MtuInfoDisplayProps) {
  const [mtuInfo, setMtuInfo] = useState<MtuInfo | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof MtuMonitorService.getStats> | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setMtuInfo(null);
      setStats(null);
      return;
    }

    const updateInfo = () => {
      setMtuInfo(MtuManager.getCurrentMtu());
      setStats(MtuMonitorService.getStats());
    };

    // Update immediately
    updateInfo();

    // Update every 5 seconds while connected
    const interval = setInterval(updateInfo, 5000);
    return () => clearInterval(interval);
  }, [isConnected]);

  if (!isConnected || !mtuInfo) {
    return null;
  }

  const performanceLevel = mtuInfo.isOptimal ? 100 : mtuInfo.negotiated > 23 ? 70 : 30;
  const fragmentationRate = stats?.fragmentation.fragmentationRate || 0;

  return (
    <Card className="w-full" data-testid="mtu-info">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Wifi className="h-4 w-4" />
          BLE Performance
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>MTU (Maximum Transmission Unit) affects data transfer speed</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MTU Information */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">MTU Size</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{mtuInfo.negotiated} bytes</span>
            <Badge variant={mtuInfo.isOptimal ? 'default' : mtuInfo.negotiated > 23 ? 'secondary' : 'destructive'}>
              {mtuInfo.isOptimal ? 'Optimal' : mtuInfo.negotiated > 23 ? 'Good' : 'Limited'}
            </Badge>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            <span className="text-xs text-muted-foreground">Transfer Performance</span>
          </div>
          <Progress value={performanceLevel} className="h-2" />
        </div>

        {/* Fragmentation Info */}
        {stats && stats.fragmentation.totalNotifications > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Fragmentation</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{fragmentationRate.toFixed(1)}%</span>
              <Badge variant={fragmentationRate < 10 ? 'default' : fragmentationRate < 25 ? 'secondary' : 'destructive'}>
                {fragmentationRate < 10 ? 'Low' : fragmentationRate < 25 ? 'Medium' : 'High'}
              </Badge>
            </div>
          </div>
        )}

        {/* Extended Data Support */}
        {mtuInfo.supportsExtended ? (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Zap className="h-3 w-3" />
            <span>Extended data supported without fragmentation</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <Zap className="h-3 w-3" />
            <span>Extended data will be fragmented</span>
          </div>
        )}

        {/* Performance Recommendations */}
        {stats && (
          <div className="mt-3">
            {MtuMonitorService.getRecommendations().map((rec, index) => (
              <div key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                <span className="text-amber-500">•</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}