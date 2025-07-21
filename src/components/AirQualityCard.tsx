import { BaseCard } from '@/components/shared/BaseCard';
import { PMDisplay, QualityIndicator } from '@/components/shared/DataDisplay';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { PMData } from '@/types/shared';

interface AirQualityData {
  pm1: number;
  pm25: number;
  pm10: number;
  location?: string;
  timestamp?: Date;
}

interface AirQualityCardProps {
  data: AirQualityData;
  className?: string;
}

export function AirQualityCard({ data, className }: AirQualityCardProps) {
  const { getCurrentThresholds, isGroupMode } = useGroupSettings();

  const getAirQualityLevel = (pm25: number, pm10: number, pm1: number) => {
    if (isGroupMode) {
      const thresholds = getCurrentThresholds();

      // Find the appropriate threshold based on the current values
      for (const threshold of thresholds) {
        if (!threshold.enabled) continue;

        const matchesPM25 =
          !threshold.pm25_min ||
          !threshold.pm25_max ||
          (pm25 >= threshold.pm25_min && pm25 <= threshold.pm25_max);
        const matchesPM10 =
          !threshold.pm10_min ||
          !threshold.pm10_max ||
          (pm10 >= threshold.pm10_min && pm10 <= threshold.pm10_max);
        const matchesPM1 =
          !threshold.pm1_min ||
          !threshold.pm1_max ||
          (pm1 >= threshold.pm1_min && pm1 <= threshold.pm1_max);

        if (matchesPM25 && matchesPM10 && matchesPM1) {
          return {
            level: threshold.name.toLowerCase().replace(' ', '-'),
            label: threshold.name,
            color: threshold.color,
          };
        }
      }
    }

    // Fallback to default thresholds
    if (pm25 <= 12) return { level: 'good', label: 'Bon', color: '#22c55e' };
    if (pm25 <= 35)
      return { level: 'moderate', label: 'Modéré', color: '#eab308' };
    if (pm25 <= 55)
      return { level: 'poor', label: 'Mauvais', color: '#f97316' };
    return { level: 'very-poor', label: 'Très mauvais', color: '#ef4444' };
  };

  const quality = getAirQualityLevel(data.pm25, data.pm10, data.pm1);

  // Create header actions with proper semantic color usage
  const headerActions = (
    <Badge
      variant="secondary"
      className="font-medium"
      style={{ 
        backgroundColor: quality.color,
        color: quality.level === 'good' ? 'hsl(var(--primary-foreground))' : 'white'
      }}
    >
      {quality.label}
    </Badge>
  );

  return (
    <BaseCard 
      title="Qualité de l'air"
      headerActions={headerActions}
      className={cn('relative overflow-hidden', className)}
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{ backgroundColor: quality.color }}
      />
      {data.location && (
        <p className="text-sm text-muted-foreground mb-4">{data.location}</p>
      )}
      <div className="relative">
        <PMDisplay data={data} />
        {data.timestamp && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Dernière mesure : {data.timestamp.toLocaleTimeString('fr-FR')}
            </p>
          </div>
        )}
      </div>
    </BaseCard>
  );
}
