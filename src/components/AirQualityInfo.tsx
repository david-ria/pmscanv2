import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Wind, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AirQualityInfo {
  id: string;
  no2_value?: number;
  o3_value?: number;
  station_name?: string;
  data_source: string;
  timestamp: string;
}

interface AirQualityInfoProps {
  airQualityDataId: string;
  compact?: boolean;
  className?: string;
}

export function AirQualityInfo({ 
  airQualityDataId, 
  compact = false, 
  className 
}: AirQualityInfoProps) {
  const [airQualityData, setAirQualityData] = useState<AirQualityInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAirQualityData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('air_quality_data')
          .select('id, no2_value, o3_value, station_name, data_source, timestamp')
          .eq('id', airQualityDataId)
          .single();

        if (error) {
          console.error('Error fetching air quality data:', error);
          return;
        }

        setAirQualityData(data);
      } catch (error) {
        console.error('Error in fetchAirQualityData:', error);
      } finally {
        setLoading(false);
      }
    };

    if (airQualityDataId) {
      fetchAirQualityData();
    }
  }, [airQualityDataId]);

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Wind className="h-4 w-4 animate-pulse" />
        <span className="text-sm">Chargement qualité de l'air...</span>
      </div>
    );
  }

  if (!airQualityData) {
    return null;
  }

  const formatValue = (value: number | undefined, unit = 'µg/m³') => {
    if (value === null || value === undefined) return 'N/A';
    return `${Math.round(value)} ${unit}`;
  };

  const getQualityLevel = (value: number | undefined, type: 'no2' | 'o3') => {
    if (!value) return 'unknown';
    
    if (type === 'no2') {
      if (value <= 40) return 'good';
      if (value <= 90) return 'moderate';
      if (value <= 120) return 'poor';
      return 'very-poor';
    } else { // o3
      if (value <= 50) return 'good';
      if (value <= 100) return 'moderate';
      if (value <= 180) return 'poor';
      return 'very-poor';
    }
  };

  const getQualityColor = (level: string) => {
    switch (level) {
      case 'good': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'very-poor': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const no2Level = getQualityLevel(airQualityData.no2_value, 'no2');
  const o3Level = getQualityLevel(airQualityData.o3_value, 'o3');

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <Activity className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-3">
          {airQualityData.no2_value !== null && airQualityData.no2_value !== undefined && (
            <span className={getQualityColor(no2Level)}>
              NO₂: {formatValue(airQualityData.no2_value)}
            </span>
          )}
          {airQualityData.o3_value !== null && airQualityData.o3_value !== undefined && (
            <span className={getQualityColor(o3Level)}>
              O₃: {formatValue(airQualityData.o3_value)}
            </span>
          )}
        </div>
        {airQualityData.station_name && (
          <span className="text-muted-foreground text-xs">
            {airQualityData.station_name}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium">Qualité de l'air</span>
        <span className="text-xs text-muted-foreground">
          ({airQualityData.data_source})
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        {airQualityData.no2_value !== null && airQualityData.no2_value !== undefined && (
          <div className="space-y-1">
            <div className="text-muted-foreground">Dioxyde d'azote (NO₂)</div>
            <div className={cn('font-medium', getQualityColor(no2Level))}>
              {formatValue(airQualityData.no2_value)}
            </div>
          </div>
        )}
        
        {airQualityData.o3_value !== null && airQualityData.o3_value !== undefined && (
          <div className="space-y-1">
            <div className="text-muted-foreground">Ozone (O₃)</div>
            <div className={cn('font-medium', getQualityColor(o3Level))}>
              {formatValue(airQualityData.o3_value)}
            </div>
          </div>
        )}
      </div>

      {airQualityData.station_name && (
        <div className="text-xs text-muted-foreground">
          Station: {airQualityData.station_name}
        </div>
      )}
    </div>
  );
}