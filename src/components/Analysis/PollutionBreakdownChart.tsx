import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { MissionData } from "@/lib/dataStorage";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";

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

  // Filter missions based on selected date and period
  const filteredMissions = () => {
    let startDate: Date;
    let endDate: Date;

    switch (selectedPeriod) {
      case "day":
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
        break;
      case "week":
        startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
        break;
      case "month":
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
        break;
      case "year":
        startDate = startOfYear(selectedDate);
        endDate = endOfYear(selectedDate);
        break;
      default:
        return missions;
    }

    return missions.filter(mission => {
      const missionDate = new Date(mission.startTime);
      return isWithinInterval(missionDate, { start: startDate, end: endDate });
    });
  };

  // Calculate breakdown data based on type and PM selection
  const getBreakdownData = () => {
    const filtered = filteredMissions();
    if (filtered.length === 0) return [];

    const dataMap = new Map<string, { 
      totalExposure: number; 
      weightedPM: number; 
      color: string;
    }>();

    filtered.forEach(mission => {
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

    const totalPM = Array.from(dataMap.values()).reduce((sum, item) => sum + (item.totalExposure > 0 ? item.weightedPM / item.totalExposure : 0), 0);
    
    return Array.from(dataMap.entries())
      .map(([key, data]) => {
        const avgPM = data.totalExposure > 0 ? data.weightedPM / data.totalExposure : 0;
        return {
          name: key,
          percentage: totalPM > 0 ? (avgPM / totalPM) * 100 : 0,
          avgPM: avgPM,
          color: data.color,
          exposure: data.totalExposure
        };
      })
      .filter(item => item.avgPM > 0) // Only show categories with PM data
      .sort((a, b) => b.avgPM - a.avgPM) // Sort by PM concentration
      .slice(0, 5); // Show top 5
  };

  const getColorForKey = (key: string): string => {
    const colors = [
      "#10b981", // green
      "#3b82f6", // blue
      "#f59e0b", // yellow
      "#f97316", // orange
      "#ef4444", // red
      "#8b5cf6", // purple
      "#ec4899"  // pink
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-80">
            {breakdownData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune donnée disponible pour cette période
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdownData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="percentage"
                    label={(entry) => `${entry.name}: ${entry.percentage.toFixed(0)}%`}
                  >
                    {breakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${value.toFixed(1)}%`,
                      `PM${pmType.replace('pm', '')}: ${Math.round(props.payload.avgPM)} μg/m³`
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Summary Table */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Résumé détaillé</h4>
            {breakdownData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            ) : (
              <div className="space-y-2">
                {breakdownData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(item.exposure)} min • PM{pmType.replace('pm', '')}: {Math.round(item.avgPM)} μg/m³
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{item.percentage.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">
                        {(item.exposure / 60).toFixed(1)}h
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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