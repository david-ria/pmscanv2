import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

export default function QualityIndicator({ value, thresholds, label, className }: QualityIndicatorProps) {
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
}