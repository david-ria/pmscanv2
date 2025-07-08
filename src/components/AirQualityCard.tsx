import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

const getAirQualityLevel = (pm25: number) => {
  if (pm25 <= 12) return { level: "good", label: "Bon", color: "air-good" };
  if (pm25 <= 35) return { level: "moderate", label: "Modéré", color: "air-moderate" };
  if (pm25 <= 55) return { level: "poor", label: "Mauvais", color: "air-poor" };
  return { level: "very-poor", label: "Très mauvais", color: "air-very-poor" };
};

export function AirQualityCard({ data, className }: AirQualityCardProps) {
  const quality = getAirQualityLevel(data.pm25);
  
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div 
        className={cn(
          "absolute inset-0 opacity-5",
          `bg-${quality.color}`
        )}
      />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Qualité de l'air</CardTitle>
          <Badge 
            variant="secondary" 
            className={cn(
              "text-white font-medium",
              `bg-${quality.color}`
            )}
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