import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { MissionData } from "@/lib/dataStorage";

interface PollutionBreakdownChartProps {
  missions: MissionData[];
  selectedPeriod: "day" | "week" | "month" | "year";
  selectedDate: Date;
}

type BreakdownType = "location" | "activity" | "autocontext";
type PMType = "pm1" | "pm25" | "pm10";

export const PollutionBreakdownChart = ({ missions, selectedPeriod, selectedDate }: PollutionBreakdownChartProps) => {
  const { t } = useTranslation();
  const [breakdownType, setBreakdownType] = useState<BreakdownType>("activity");
  const [pmType, setPmType] = useState<PMType>("pm25");

  // Calculate breakdown data based on type and PM selection
  const getBreakdownData = () => {
    if (missions.length === 0) return [];

    const dataMap = new Map<string, { 
      totalExposure: number; 
      weightedPM: number; 
      color: string;
    }>();

    missions.forEach(mission => {
      let key = "";
      
      switch (breakdownType) {
        case "location":
          key = mission.locationContext || "Inconnue";
          break;
        case "activity":
          key = mission.activityContext || "Inconnue";
          break;
        case "autocontext":
          key = "Auto"; // Simplified for now
          break;
      }

      const pmValue = pmType === "pm1" ? mission.avgPm1 : 
                     pmType === "pm25" ? mission.avgPm25 : 
                     mission.avgPm10;

      const existing = dataMap.get(key) || { 
        totalExposure: 0, 
        weightedPM: 0,
        color: getColorForKey(key)
      };
      
      existing.totalExposure += mission.durationMinutes;
      existing.weightedPM += pmValue * mission.durationMinutes;
      
      dataMap.set(key, existing);
    });

    const totalExposure = Array.from(dataMap.values()).reduce((sum, item) => sum + item.totalExposure, 0);
    
    return Array.from(dataMap.entries())
      .map(([key, data]) => ({
        name: key,
        percentage: totalExposure > 0 ? (data.totalExposure / totalExposure) * 100 : 0,
        avgPM: data.totalExposure > 0 ? data.weightedPM / data.totalExposure : 0,
        color: data.color,
        exposure: data.totalExposure
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5); // Show top 5
  };

  const getColorForKey = (key: string): string => {
    const colors = [
      "bg-green-500",
      "bg-blue-500", 
      "bg-yellow-500",
      "bg-orange-500",
      "bg-red-500",
      "bg-purple-500",
      "bg-pink-500"
    ];
    
    const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getWHOStatus = (avgPM: number): string => {
    if (pmType === "pm25") {
      return avgPM > 15 ? "bg-red-500" : avgPM > 12 ? "bg-orange-500" : "bg-green-500";
    } else if (pmType === "pm10") {
      return avgPM > 45 ? "bg-red-500" : avgPM > 20 ? "bg-orange-500" : "bg-green-500";
    }
    return "bg-gray-400"; // PM1 has no WHO threshold
  };

  const breakdownData = getBreakdownData();

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Analyse des données</CardTitle>
        
        {/* Radio buttons for breakdown type */}
        <RadioGroup
          value={breakdownType}
          onValueChange={(value) => setBreakdownType(value as BreakdownType)}
          className="flex justify-center space-x-8"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="location" id="location" />
            <Label htmlFor="location" className="cursor-pointer">localisation</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="activity" id="activity" />
            <Label htmlFor="activity" className="cursor-pointer">activity</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="autocontext" id="autocontext" />
            <Label htmlFor="autocontext" className="cursor-pointer">autocontext</Label>
          </div>
        </RadioGroup>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Chart area */}
        <div className="space-y-4">
          {breakdownData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune donnée disponible pour cette période
            </div>
          ) : (
            <div className="space-y-3">
              {breakdownData.map((item, index) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">{item.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                      <div 
                        className={`h-full ${getWHOStatus(item.avgPM)} transition-all duration-500`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="w-16 h-6 bg-red-200 dark:bg-red-900/30 rounded flex items-center justify-center">
                      <span className="text-xs text-red-700 dark:text-red-300 font-medium">
                        {Math.round(item.avgPM)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PM Type Selector */}
        <div className="flex justify-center space-x-2">
          <Button
            variant={pmType === "pm1" ? "default" : "outline"}
            size="sm"
            onClick={() => setPmType("pm1")}
          >
            PM1
          </Button>
          <Button
            variant={pmType === "pm25" ? "default" : "outline"}
            size="sm"
            onClick={() => setPmType("pm25")}
          >
            PM2.5
          </Button>
          <Button
            variant={pmType === "pm10" ? "default" : "outline"}
            size="sm"
            onClick={() => setPmType("pm10")}
          >
            PM10
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};