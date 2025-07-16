import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wind, RefreshCw, MapPin, Clock } from 'lucide-react';
import { usePeriodicAirQuality } from '@/hooks/usePeriodicAirQuality';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function AirQualityDisplay() {
  const { t } = useTranslation();
  const { 
    currentAirQuality, 
    isLoading, 
    lastFetchTime, 
    refreshAirQuality,
    isEnabled 
  } = usePeriodicAirQuality();

  if (!isEnabled) {
    return (
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Wind className="h-4 w-4" />
            {t('sensors.airQuality')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center text-sm text-muted-foreground">
            {t('sensors.airQuality')} désactivé
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (value: number | undefined, unit = 'µg/m³') => {
    if (value === null || value === undefined) return 'N/A';
    return `${Math.round(value)} ${unit}`;
  };

  const getQualityLevel = (value: number | undefined, type: 'no2' | 'o3') => {
    if (!value) return { level: 'unknown', color: 'muted-foreground' };
    
    if (type === 'no2') {
      if (value <= 40) return { level: 'good', color: 'green-600' };
      if (value <= 90) return { level: 'moderate', color: 'yellow-600' };
      if (value <= 120) return { level: 'poor', color: 'orange-600' };
      return { level: 'very-poor', color: 'red-600' };
    } else { // o3
      if (value <= 50) return { level: 'good', color: 'green-600' };
      if (value <= 100) return { level: 'moderate', color: 'yellow-600' };
      if (value <= 180) return { level: 'poor', color: 'orange-600' };
      return { level: 'very-poor', color: 'red-600' };
    }
  };

  const no2Quality = getQualityLevel(currentAirQuality?.no2_value, 'no2');
  const o3Quality = getQualityLevel(currentAirQuality?.o3_value, 'o3');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4" />
            {t('sensors.airQuality')}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshAirQuality}
            disabled={isLoading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {currentAirQuality ? (
          <>
            {/* NO2 and O3 Values */}
            <div className="grid grid-cols-2 gap-3">
              {/* NO2 */}
              <div className="text-center p-2 bg-muted/20 rounded-lg">
                <div className={cn("text-lg font-bold", `text-${no2Quality.color}`)}>
                  {formatValue(currentAirQuality.no2_value)}
                </div>
                <div className="text-xs text-muted-foreground">NO₂</div>
              </div>
              
              {/* O3 */}
              <div className="text-center p-2 bg-muted/20 rounded-lg">
                <div className={cn("text-lg font-bold", `text-${o3Quality.color}`)}>
                  {formatValue(currentAirQuality.o3_value)}
                </div>
                <div className="text-xs text-muted-foreground">O₃</div>
              </div>
            </div>
            
            {/* Station Info */}
            {currentAirQuality.station_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{currentAirQuality.station_name}</span>
              </div>
            )}
            
            {/* Last Update */}
            {lastFetchTime && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Mis à jour : {lastFetchTime.toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            {isLoading ? (
              <div className="flex items-center gap-2 justify-center">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : (
              <div>
                Aucune donnée disponible
                <div className="text-xs mt-1">
                  Vérifiez votre position GPS
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}