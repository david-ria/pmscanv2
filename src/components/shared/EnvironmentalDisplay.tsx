import { EnvironmentalData } from '@/types/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import PMDisplay from './PMDisplay';

interface EnvironmentalDisplayProps {
  data: EnvironmentalData;
  showPM?: boolean;
  showTimestamp?: boolean;
  className?: string;
}

export default function EnvironmentalDisplay({ 
  data, 
  showPM = true, 
  showTimestamp = false, 
  className 
}: EnvironmentalDisplayProps) {
  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showPM && <PMDisplay data={data} />}
      
      <div className="flex items-center gap-2">
        {data.temperature !== undefined && (
          <Badge variant="secondary">
            🌡️ {data.temperature.toFixed(1)}°C
          </Badge>
        )}
        {data.humidity !== undefined && (
          <Badge variant="secondary">
            💧 {data.humidity.toFixed(1)}%
          </Badge>
        )}
      </div>
      
      {showTimestamp && (
        <div className="text-xs text-muted-foreground">
          {formatTimestamp(data.timestamp)}
        </div>
      )}
    </div>
  );
}