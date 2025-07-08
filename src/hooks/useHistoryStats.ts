import { useMemo } from "react";
import { MissionData } from "@/lib/dataStorage";

export function useHistoryStats(filteredMissions: MissionData[]) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  const periodStats = useMemo(() => {
    if (filteredMissions.length === 0) {
      return [
        { label: "Exposition totale", value: "0 min", color: "default" as const },
        { label: "Moyenne PM2.5", value: 0, unit: "µg/m³", color: "default" as const },
        { label: "PM2.5 > OMS (15)", value: "0 min", color: "default" as const },
        { label: "PM10 > OMS (45)", value: "0 min", color: "default" as const }
      ];
    }

    const totalDuration = filteredMissions.reduce((sum, m) => sum + m.durationMinutes, 0);
    const avgPm25 = filteredMissions.reduce((sum, m) => sum + m.avgPm25, 0) / filteredMissions.length;
    
    // Calculate time above WHO thresholds
    const timeAboveWHO_PM25 = filteredMissions.reduce((sum, m) => {
      return m.avgPm25 > 15 ? sum + m.durationMinutes : sum;
    }, 0);
    
    const timeAboveWHO_PM10 = filteredMissions.reduce((sum, m) => {
      return m.avgPm10 > 45 ? sum + m.durationMinutes : sum;
    }, 0);

    const getColorFromPm25 = (pm25: number) => {
      if (pm25 <= 12) return "good" as const;
      if (pm25 <= 35) return "moderate" as const;
      if (pm25 <= 55) return "poor" as const;
      return "poor" as const;
    };

    const getColorFromTime = (timeAbove: number, totalTime: number) => {
      const percentage = (timeAbove / totalTime) * 100;
      if (percentage <= 10) return "good" as const;
      if (percentage <= 30) return "moderate" as const;
      return "poor" as const;
    };

    return [
      { label: "Exposition totale", value: formatDuration(totalDuration), color: "default" as const },
      { label: "Moyenne PM2.5", value: Math.round(avgPm25), unit: "µg/m³", color: getColorFromPm25(avgPm25) },
      { 
        label: "PM2.5 > OMS (15)", 
        value: formatDuration(timeAboveWHO_PM25), 
        color: getColorFromTime(timeAboveWHO_PM25, totalDuration) 
      },
      { 
        label: "PM10 > OMS (45)", 
        value: formatDuration(timeAboveWHO_PM10), 
        color: getColorFromTime(timeAboveWHO_PM10, totalDuration) 
      }
    ];
  }, [filteredMissions]);

  return periodStats;
}