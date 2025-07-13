import { useMemo } from "react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { MissionData } from "@/lib/dataStorage";
import { getColorForKey } from "./utils";

type BreakdownType = "location" | "activity" | "autocontext";
type PMType = "pm1" | "pm25" | "pm10";

interface BreakdownData {
  name: string;
  percentage: number;
  avgPM: number;
  color: string;
  exposure: number;
}

export const usePollutionBreakdownData = (
  missions: MissionData[],
  selectedPeriod: "day" | "week" | "month" | "year",
  selectedDate: Date,
  breakdownType: BreakdownType,
  pmType: PMType
): BreakdownData[] => {
  return useMemo(() => {
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
        // For autocontext, we need to aggregate data from all measurements
        if (breakdownType === "autocontext") {
          const contextMap = new Map<string, { totalExposure: number; weightedPM: number }>();
          
          mission.measurements.forEach(measurement => {
            const autoContext = measurement.automaticContext || "Inconnu";
            const pmValue = pmType === "pm1" ? measurement.pm1 : 
                           pmType === "pm25" ? measurement.pm25 : 
                           measurement.pm10;
            
            const existing = contextMap.get(autoContext) || { totalExposure: 0, weightedPM: 0 };
            // Assume each measurement represents equal time exposure
            const measurementDuration = mission.durationMinutes / mission.measurements.length;
            existing.totalExposure += measurementDuration;
            existing.weightedPM += pmValue * measurementDuration;
            contextMap.set(autoContext, existing);
          });
          
          // Add each context from this mission to the main dataMap
          contextMap.forEach((data, context) => {
            const existing = dataMap.get(context) || { 
              totalExposure: 0, 
              weightedPM: 0,
              color: getColorForKey(context)
            };
            existing.totalExposure += data.totalExposure;
            existing.weightedPM += data.weightedPM;
            dataMap.set(context, existing);
          });
        } else {
          let key = "";
          
          switch (breakdownType) {
            case "location":
              key = mission.locationContext || "Inconnue";
              break;
            case "activity":
              key = mission.activityContext || "Inconnue";
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
        }
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

    return getBreakdownData();
  }, [missions, selectedPeriod, selectedDate, breakdownType, pmType]);
};
