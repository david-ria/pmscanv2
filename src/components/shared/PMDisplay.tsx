import { PMData } from '@/types/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PMDisplayProps {
  data: PMData;
  showLabels?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PMDisplay({ data, showLabels = true, className, size = 'md' }: PMDisplayProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const formatValue = (value: number) => value.toFixed(1);

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
}