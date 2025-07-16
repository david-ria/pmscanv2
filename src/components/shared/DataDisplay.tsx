import { PMData, EnvironmentalData } from '@/types/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PMDisplayProps {
  data: PMData;
  showLabels?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PMDisplay = ({ data, showLabels = true, className, size = 'md' }: PMDisplayProps) => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const formatValue = (value: number) => Math.round(value);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant="outline" className={sizeClasses[size]}>
        {showLabels && 'PM1:'} {formatValue(data.pm1)} μg/m³
      </Badge>
      <Badge variant="outline" className={sizeClasses[size]}>
        {showLabels && 'PM2.5:'} {formatValue(data.pm25)} μg/m³
      </Badge>
      <Badge variant="outline" className={sizeClasses[size]}>
        {showLabels && 'PM10:'} {formatValue(data.pm10)} μg/m³
      </Badge>
    </div>
  );
};

interface EnvironmentalDisplayProps {
  data: EnvironmentalData;
  showPM?: boolean;
  showTimestamp?: boolean;
  className?: string;
}

export const EnvironmentalDisplay = ({ 
  data, 
  showPM = true, 
  showTimestamp = false, 
  className 
}: EnvironmentalDisplayProps) => {
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
            🌡️ {Math.round(data.temperature)}°C
          </Badge>
        )}
        {data.humidity !== undefined && (
          <Badge variant="secondary">
            💧 {Math.round(data.humidity)}%
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
};

interface QualityIndicatorProps {
  value: number;
  thresholds: {
    good: number;
    moderate: number;
    poor: number;
  };
  label?: string;
  className?: string;
}

export const QualityIndicator = ({ value, thresholds, label, className }: QualityIndicatorProps) => {
  const getQualityLevel = () => {
    if (value <= thresholds.good) return { level: 'Good', color: 'bg-green-500', variant: 'default' as const };
    if (value <= thresholds.moderate) return { level: 'Moderate', color: 'bg-yellow-500', variant: 'secondary' as const };
    if (value <= thresholds.poor) return { level: 'Poor', color: 'bg-orange-500', variant: 'destructive' as const };
    return { level: 'Very Poor', color: 'bg-red-500', variant: 'destructive' as const };
  };

  const quality = getQualityLevel();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && <span className="text-sm font-medium">{label}:</span>}
      <Badge variant={quality.variant} className="gap-1">
        <div className={cn("w-2 h-2 rounded-full", quality.color)} />
        {quality.level}
      </Badge>
      <span className="text-sm text-muted-foreground">{Math.round(value)} μg/m³</span>
    </div>
  );
};