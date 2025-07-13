import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGroupSettings } from "@/hooks/useGroupSettings";

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
        
        const matchesPM25 = !threshold.pm25_min || !threshold.pm25_max || 
          (pm25 >= threshold.pm25_min && pm25 <= threshold.pm25_max);
        const matchesPM10 = !threshold.pm10_min || !threshold.pm10_max || 
          (pm10 >= threshold.pm10_min && pm10 <= threshold.pm10_max);
        const matchesPM1 = !threshold.pm1_min || !threshold.pm1_max || 
          (pm1 >= threshold.pm1_min && pm1 <= threshold.pm1_max);
          
        if (matchesPM25 && matchesPM10 && matchesPM1) {
          return { 
            level: threshold.name.toLowerCase().replace(' ', '-'), 
            label: threshold.name, 
            color: threshold.color 
          };
        }
      }
    }
    
    // Fallback to default thresholds
    if (pm25 <= 12) return { level: "good", label: "Bon", color: "#22c55e" };
    if (pm25 <= 35) return { level: "moderate", label: "Modéré", color: "#eab308" };
    if (pm25 <= 55) return { level: "poor", label: "Mauvais", color: "#f97316" };
    return { level: "very-poor", label: "Très mauvais", color: "#ef4444" };
  };

  const quality = getAirQualityLevel(data.pm25, data.pm10, data.pm1);
  
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div 
        className="absolute inset-0 opacity-5"
        style={{ backgroundColor: quality.color }}
      />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Qualité de l'air</CardTitle>
          <Badge 
            variant="secondary" 
            className="text-white font-medium"
            style={{ backgroundColor: quality.color }}
          >
            {quality.label}
          </Badge>
        </div>
        {data.location && (
          <p className="text-sm text-muted-foreground">{data.location}</p>
        )}
      </CardHeader>
      <CardContent className="relative">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{data.pm1}</div>
            <div className="text-xs text-muted-foreground">PM1</div>
            <div className="text-xs text-muted-foreground">µg/m³</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{data.pm25}</div>
            <div className="text-xs text-muted-foreground">PM2.5</div>
            <div className="text-xs text-muted-foreground">µg/m³</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{data.pm10}</div>
            <div className="text-xs text-muted-foreground">PM10</div>
            <div className="text-xs text-muted-foreground">µg/m³</div>
          </div>
        </div>
        {data.timestamp && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Dernière mesure : {data.timestamp.toLocaleTimeString('fr-FR')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
