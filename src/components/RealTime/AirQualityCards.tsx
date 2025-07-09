import { Card, CardContent } from "@/components/ui/card";
import { PMScanData } from "@/lib/pmscan/types";
import { useTranslation } from "react-i18next";

interface AirQualityCardsProps {
  currentData: PMScanData | null;
  isConnected: boolean;
}

export function AirQualityCards({ currentData, isConnected }: AirQualityCardsProps) {
  const { t } = useTranslation();
  
  const getAirQualityLevel = (pm25: number) => {
    if (pm25 <= 12) return { level: "good", label: t('realTime.airQuality.good'), color: "air-good" };
    if (pm25 <= 35) return { level: "moderate", label: t('realTime.airQuality.moderate'), color: "air-moderate" };
    if (pm25 <= 55) return { level: "poor", label: t('realTime.airQuality.poor'), color: "air-poor" };
    return { level: "very-poor", label: t('realTime.airQuality.veryPoor'), color: "air-very-poor" };
  };

  if (!isConnected || !currentData) {
    return (
      <>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* No Data Cards */}
          <Card className="text-center bg-muted/30">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-muted-foreground mb-1">--</div>
              <div className="text-sm font-medium text-muted-foreground">PM1</div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-muted/30">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-muted-foreground mb-1">--</div>
              <div className="text-sm font-medium text-muted-foreground">PM2.5</div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-muted/30">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-muted-foreground mb-1">--</div>
              <div className="text-sm font-medium text-muted-foreground">PM10</div>
              <div className="text-xs text-muted-foreground">μg/m³</div>
            </CardContent>
          </Card>
        </div>
        
        <div className="text-center text-sm text-muted-foreground mb-4 p-4 bg-muted/20 rounded-lg">
          {t('realTime.connectSensor')}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* PM1 */}
        <Card className="text-center bg-card/50">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-foreground mb-1">
              {Math.round(currentData.pm1)}
            </div>
            <div className="text-sm font-medium text-muted-foreground">PM1</div>
            <div className="text-xs text-muted-foreground">μg/m³</div>
          </CardContent>
        </Card>

        {/* PM2.5 - Main indicator with quality status */}
        <Card className="text-center relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-20"
            style={{backgroundColor: `hsl(var(--${getAirQualityLevel(currentData.pm25).color}))`}}
          />
          <CardContent className="p-4 relative">
            <div 
              className="text-3xl font-bold mb-1"
              style={{color: `hsl(var(--${getAirQualityLevel(currentData.pm25).color}))`}}
            >
              {Math.round(currentData.pm25)}
            </div>
            <div className="text-sm font-medium text-muted-foreground">PM2.5</div>
            <div className="text-xs text-muted-foreground mb-2">μg/m³</div>
            <div 
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{
                backgroundColor: `hsl(var(--${getAirQualityLevel(currentData.pm25).color}) / 0.2)`,
                color: `hsl(var(--${getAirQualityLevel(currentData.pm25).color}))`
              }}
            >
              {getAirQualityLevel(currentData.pm25).label}
            </div>
          </CardContent>
        </Card>

        {/* PM10 */}
        <Card className="text-center bg-card/50">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-foreground mb-1">
              {Math.round(currentData.pm10)}
            </div>
            <div className="text-sm font-medium text-muted-foreground">PM10</div>
            <div className="text-xs text-muted-foreground">μg/m³</div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status */}
      <div className="text-center text-xs text-muted-foreground mb-4">
        {t('realTime.lastMeasurement')} : {currentData.timestamp.toLocaleTimeString()}
      </div>
    </>
  );
}