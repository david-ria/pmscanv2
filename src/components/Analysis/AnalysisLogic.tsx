import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { dataStorage, MissionData } from "@/lib/dataStorage";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { useTranslation } from "react-i18next";
import * as logger from "@/utils/logger";

interface AnalysisData {
  totalMissions: number;
  totalExposureMinutes: number;
  averagePM25: number;
  maxPM25: number;
  timeAboveWHO: number;
}

interface ActivityData {
  activity: string;
  timeSpent: number;
  cumulativeDose: number; // In µg·h/m³
  averageExposure: number;
  measurements: number;
}

export const useAnalysisLogic = (
  selectedDate: Date,
  selectedPeriod: "day" | "week" | "month" | "year"
) => {
  const { t } = useTranslation();
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [statisticalAnalysis, setStatisticalAnalysis] = useState<string>("");
  const [dataPoints, setDataPoints] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisGenerated, setAnalysisGenerated] = useState(false);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const { toast } = useToast();

  // Load missions on component mount
  useEffect(() => {
    loadMissions();
  }, []);

  // Generate analysis when missions or date filter changes
  useEffect(() => {
    if (missions.length > 0 && !loading) {
      generateAnalysis();
      loadActivityData();
    }
  }, [missions, selectedDate, selectedPeriod]);

  const loadMissions = async () => {
    try {
      const missionData = await dataStorage.getAllMissions();
      setMissions(missionData);
    } catch (error) {
      console.error('Error loading missions:', error);
      toast({
        title: t('analysis.error'),
        description: t('analysis.errorLoadingMissions'),
        variant: "destructive"
      });
    }
  };

  const loadActivityData = () => {
    try {
      const filtered = filteredMissions();
      if (filtered.length === 0) {
        setActivityData([]);
        return;
      }

      // Group missions by activity context
      const activityMap = new Map<string, {
        totalDuration: number;
        totalPM25: number;
        cumulativeDose: number;
        measurements: number;
      }>();

      filtered.forEach(mission => {
        const activity = mission.activityContext || t('analysis.unknownActivity');
        const existing = activityMap.get(activity) || {
          totalDuration: 0,
          totalPM25: 0,
          cumulativeDose: 0,
          measurements: 0
        };

        const durationHours = mission.durationMinutes / 60; // Convert minutes to hours
        const dose = mission.avgPm25 * durationHours; // Ci × Δti formula
        
        existing.totalDuration += mission.durationMinutes;
        existing.totalPM25 += mission.avgPm25 * mission.durationMinutes; // Weight by duration
        existing.cumulativeDose += dose; // Cumulative dose in µg·h/m³
        existing.measurements += mission.measurementsCount;

        activityMap.set(activity, existing);
      });

      // Convert to array and calculate averages
      const activities = Array.from(activityMap.entries()).map(([activity, data]) => ({
        activity,
        timeSpent: data.totalDuration,
        cumulativeDose: data.cumulativeDose, // Total cumulative dose for this activity
        averageExposure: data.totalDuration > 0 ? data.totalPM25 / data.totalDuration : 0,
        measurements: data.measurements
      }));

      // Sort by cumulative dose (descending) - most exposed activities first
      activities.sort((a, b) => b.cumulativeDose - a.cumulativeDose);
      setActivityData(activities);
    } catch (error) {
      console.error('Error loading activity data:', error);
      setActivityData([]);
    }
  };

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

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const filtered = filteredMissions();
      
      logger.debug('Total missions available:', missions.length);
      logger.debug('Filtered missions for analysis:', filtered.length);
      logger.debug('Selected period:', selectedPeriod);
      logger.debug('Selected date:', selectedDate);
      
      if (filtered.length === 0) {
        const hasAnyMissions = missions.length > 0;
        if (hasAnyMissions) {
          setStatisticalAnalysis(`${t(`analysis.noDataForPeriod.${selectedPeriod}`)}\n\n${t('analysis.youHaveMissions', { count: missions.length })}\n\n${t('analysis.tryTo')}\n${t('analysis.changePeriod')}\n${t('analysis.selectDifferentDate')}\n${t('analysis.goToHistory')}`);
        } else {
          setStatisticalAnalysis(`${t('analysis.noDataAvailable')}\n\n${t('analysis.forPersonalizedAnalysis')}\n${t('analysis.goToRealTime')}\n${t('analysis.connectSensor')}\n${t('analysis.startRecording')}\n${t('analysis.comeBackHere')}`);
        }
        setDataPoints({
          totalMissions: missions.length,
          totalExposureMinutes: 0,
          averagePM25: 0,
          maxPM25: 0,
          timeAboveWHO: 0
        });
        setAnalysisGenerated(true);
        return;
      }

      const timeframeText = selectedPeriod === "day" ? t('history.periods.day') : 
                           selectedPeriod === "week" ? t('history.periods.week') : 
                           selectedPeriod === "month" ? t('history.periods.month') : t('history.periods.year');

      // Generate local statistical analysis with PM1, PM2.5, and PM10
      const validMissions = filtered.filter(m => 
        m.avgPm25 != null && !isNaN(m.avgPm25) &&
        m.avgPm1 != null && !isNaN(m.avgPm1) &&
        m.avgPm10 != null && !isNaN(m.avgPm10)
      );
      
      const totalExposureMinutes = filtered.reduce((sum, m) => sum + (m.durationMinutes || 0), 0);
      
      // Calculate averages for all PM types
      const avgPM1 = validMissions.length > 0 ? validMissions.reduce((sum, m) => sum + m.avgPm1, 0) / validMissions.length : 0;
      const avgPM25 = validMissions.length > 0 ? validMissions.reduce((sum, m) => sum + m.avgPm25, 0) / validMissions.length : 0;
      const avgPM10 = validMissions.length > 0 ? validMissions.reduce((sum, m) => sum + m.avgPm10, 0) / validMissions.length : 0;
      
      // Calculate maximums for all PM types
      const maxPM1 = validMissions.length > 0 ? Math.max(...validMissions.map(m => m.avgPm1 || 0)) : 0;
      const maxPM25 = validMissions.length > 0 ? Math.max(...validMissions.map(m => m.maxPm25 || 0)) : 0;
      const maxPM10 = validMissions.length > 0 ? Math.max(...validMissions.map(m => m.avgPm10 || 0)) : 0;
      
      // Calculate WHO threshold exceedances for each PM type
      const timeAboveWHO_PM25 = filtered.reduce((total, mission) => {
        if (mission.avgPm25 != null && !isNaN(mission.avgPm25) && mission.avgPm25 > 15) {
          return total + (mission.durationMinutes || 0);
        }
        return total;
      }, 0);
      
      const timeAboveWHO_PM10 = filtered.reduce((total, mission) => {
        if (mission.avgPm10 != null && !isNaN(mission.avgPm10) && mission.avgPm10 > 45) {
          return total + (mission.durationMinutes || 0);
        }
        return total;
      }, 0);

      // Calculate total cumulative dose for all missions
      const totalCumulativeDosePM25 = filtered.reduce((total, mission) => {
        const durationHours = mission.durationMinutes / 60;
        return total + (mission.avgPm25 * durationHours);
      }, 0);

      const totalCumulativeDosePM10 = filtered.reduce((total, mission) => {
        const durationHours = mission.durationMinutes / 60;
        return total + (mission.avgPm10 * durationHours);
      }, 0);

      // Create comprehensive statistical summary
      const exposureHours = (totalExposureMinutes / 60).toFixed(1);
      const whoExceedancePercentage_PM25 = totalExposureMinutes > 0 ? ((timeAboveWHO_PM25 / totalExposureMinutes) * 100).toFixed(1) : 0;
      const whoExceedancePercentage_PM10 = totalExposureMinutes > 0 ? ((timeAboveWHO_PM10 / totalExposureMinutes) * 100).toFixed(1) : 0;
      
      // Overall air quality assessment based on most restrictive PM value
      const getAirQualityStatus = () => {
        const worstPM = Math.max(avgPM25, avgPM10 / 3); // Normalize PM10 for comparison
        if (worstPM <= 12) return '✅ Qualité de l\'air bonne - Toutes les particules dans les normes';
        if (worstPM <= 35) return '⚠️ Qualité de l\'air modérée - Surveillance recommandée';
        if (worstPM <= 55) return '🔶 Qualité de l\'air mauvaise - Précautions nécessaires';
        return '🔴 Qualité de l\'air très mauvaise - Éviter l\'exposition prolongée';
      };
      
      const analysisText = `📊 ANALYSE STATISTIQUE COMPLÈTE - ${timeframeText.toUpperCase()}

🔢 RÉSUMÉ DES DONNÉES:
• Nombre de missions: ${filtered.length}
• Temps d'exposition total: ${Math.round(totalExposureMinutes)} minutes (${exposureHours} heures)

🌫️ PARTICULES FINES (MOYENNES):
• PM1.0: ${avgPM1.toFixed(1)} μg/m³ (max: ${maxPM1.toFixed(1)} μg/m³)
• PM2.5: ${avgPM25.toFixed(1)} μg/m³ (max: ${maxPM25.toFixed(1)} μg/m³)
• PM10: ${avgPM10.toFixed(1)} μg/m³ (max: ${maxPM10.toFixed(1)} μg/m³)

💨 DOSE CUMULÉE INHALÉE:
• PM2.5: ${totalCumulativeDosePM25.toFixed(1)} μg·h/m³
• PM10: ${totalCumulativeDosePM10.toFixed(1)} μg·h/m³
• Formule: Dose = ∑(Concentration × Temps d'exposition)

⚠️ SEUILS OMS (Organisation Mondiale de la Santé):
• PM2.5 > 15 μg/m³: ${timeAboveWHO_PM25.toFixed(0)} min (${whoExceedancePercentage_PM25}% du temps)
• PM10 > 45 μg/m³: ${timeAboveWHO_PM10.toFixed(0)} min (${whoExceedancePercentage_PM10}% du temps)
• PM1.0: Pas de seuil OMS défini (particules ultrafines)

📋 CLASSIFICATION DES PARTICULES:
• PM1.0: Particules ultrafines - Pénètrent profondément dans les alvéoles
• PM2.5: Particules fines - Atteignent les voies respiratoires inférieures
• PM10: Particules grossières - Affectent principalement les voies supérieures

📈 ÉVALUATION GLOBALE:
${getAirQualityStatus()}

🏆 MISSIONS LES PLUS EXPOSÉES (PM2.5):
${filtered
  .sort((a, b) => (b.avgPm25 || 0) - (a.avgPm25 || 0))
  .slice(0, 3)
  .map((m, i) => `${i + 1}. ${m.name}: PM2.5=${(m.avgPm25 || 0).toFixed(1)}, PM10=${(m.avgPm10 || 0).toFixed(1)} μg/m³`)
  .join('\n')}

💡 RECOMMANDATIONS:
${avgPM25 > 15 || avgPM10 > 45 ? 
  '• Limitez les activités extérieures intenses\n• Consultez les prévisions de qualité de l\'air\n• Considérez un purificateur d\'air intérieur' : 
  '• Qualité de l\'air acceptable\n• Continuez le monitoring pour détecter les variations\n• Maintenez une bonne ventilation intérieure'}`;

      setStatisticalAnalysis(analysisText);
      setDataPoints({
        totalMissions: filtered.length,
        totalExposureMinutes,
        averagePM25: avgPM25,
        maxPM25,
        timeAboveWHO: timeAboveWHO_PM25 // Use PM2.5 WHO exceedance for consistency
      });
      setAnalysisGenerated(true);

      toast({
        title: t('analysis.analysisGenerated'),
        description: t('analysis.analysisReady')
      });

    } catch (error) {
      console.error('Error generating analysis:', error);
      setStatisticalAnalysis(`${t('analysis.unableToGenerate')}\n\n${t('analysis.forPersonalizedReport')}\n${t('analysis.checkRecordedData')}\n${t('analysis.goToRealTimeForMeasures')}\n${t('analysis.comeBackInMoments')}\n\n${t('analysis.changePeriodIfPersists')}`);
      toast({
        title: t('analysis.analysisUnavailable'),
        description: t('analysis.checkDataAndRetry'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateAnalysis = () => {
    setAnalysisGenerated(false);
    generateAnalysis();
  };

  return {
    missions,
    statisticalAnalysis,
    dataPoints,
    loading,
    analysisGenerated,
    activityData,
    regenerateAnalysis
  };
};