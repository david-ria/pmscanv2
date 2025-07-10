import { useState, useEffect } from "react";
import { Download, Trophy, RefreshCw, Calendar, Activity, Clock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DateFilter } from "@/components/DateFilter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { dataStorage, MissionData } from "@/lib/dataStorage";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { useTranslation } from "react-i18next";

export default function Analysis() {
  const { t } = useTranslation();
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">("week");
  const [statisticalAnalysis, setStatisticalAnalysis] = useState<string>("");
  const [dataPoints, setDataPoints] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analysisGenerated, setAnalysisGenerated] = useState(false);
  const [showActivityExposure, setShowActivityExposure] = useState(false);
  const [activityData, setActivityData] = useState<Array<{
    activity: string;
    timeSpent: number; // in minutes
    averageExposure: number; // average PM2.5
    measurements: number;
  }>>([]);
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
        measurements: number;
      }>();

      filtered.forEach(mission => {
        const activity = mission.activityContext || t('analysis.unknownActivity');
        const existing = activityMap.get(activity) || {
          totalDuration: 0,
          totalPM25: 0,
          measurements: 0
        };

        existing.totalDuration += mission.durationMinutes;
        existing.totalPM25 += mission.avgPm25 * mission.durationMinutes; // Weight by duration
        existing.measurements += mission.measurementsCount;

        activityMap.set(activity, existing);
      });

      // Convert to array and calculate averages
      const activities = Array.from(activityMap.entries()).map(([activity, data]) => ({
        activity,
        timeSpent: data.totalDuration,
        averageExposure: data.totalDuration > 0 ? data.totalPM25 / data.totalDuration : 0,
        measurements: data.measurements
      }));

      // Sort by time spent (descending)
      activities.sort((a, b) => b.timeSpent - a.timeSpent);
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
      
      console.log('Total missions available:', missions.length);
      console.log('Filtered missions for analysis:', filtered.length);
      console.log('Selected period:', selectedPeriod);
      console.log('Selected date:', selectedDate);
      
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

      // Generate local statistical analysis instead of AI analysis
      const validMissions = filtered.filter(m => m.avgPm25 != null && !isNaN(m.avgPm25));
      const totalExposureMinutes = filtered.reduce((sum, m) => sum + (m.durationMinutes || 0), 0);
      const avgPM25 = validMissions.length > 0 ? validMissions.reduce((sum, m) => sum + m.avgPm25, 0) / validMissions.length : 0;
      const maxPM25 = validMissions.length > 0 ? Math.max(...validMissions.map(m => m.maxPm25 || 0)) : 0;
      const timeAboveWHO = filtered.reduce((total, mission) => {
        if (mission.avgPm25 != null && !isNaN(mission.avgPm25) && mission.avgPm25 > 15) {
          return total + (mission.durationMinutes || 0);
        }
        return total;
      }, 0);

      // Create statistical summary
      const exposureHours = (totalExposureMinutes / 60).toFixed(1);
      const whoExceedancePercentage = totalExposureMinutes > 0 ? ((timeAboveWHO / totalExposureMinutes) * 100).toFixed(1) : 0;
      
      const analysisText = `📊 ANALYSE STATISTIQUE - ${timeframeText.toUpperCase()}

🔢 RÉSUMÉ DES DONNÉES:
• Nombre de missions: ${filtered.length}
• Temps d'exposition total: ${Math.round(totalExposureMinutes)} minutes (${exposureHours} heures)
• PM2.5 moyen: ${avgPM25.toFixed(1)} μg/m³
• PM2.5 maximum: ${maxPM25.toFixed(1)} μg/m³

⚠️ SEUILS OMS:
• Temps au-dessus du seuil OMS (15 μg/m³): ${timeAboveWHO.toFixed(0)} minutes
• Pourcentage d'exposition au-dessus du seuil: ${whoExceedancePercentage}%

📈 ÉVALUATION:
${avgPM25 <= 12 ? '✅ Qualité de l\'air bonne - PM2.5 dans les normes' : 
  avgPM25 <= 35 ? '⚠️ Qualité de l\'air modérée - Surveillance recommandée' : 
  avgPM25 <= 55 ? '🔶 Qualité de l\'air mauvaise - Précautions nécessaires' : 
  '🔴 Qualité de l\'air très mauvaise - Éviter l\'exposition prolongée'}

📍 MISSIONS LES PLUS EXPOSÉES:
${filtered
  .sort((a, b) => (b.avgPm25 || 0) - (a.avgPm25 || 0))
  .slice(0, 3)
  .map((m, i) => `${i + 1}. ${m.name}: ${(m.avgPm25 || 0).toFixed(1)} μg/m³`)
  .join('\n')}`;

      setStatisticalAnalysis(analysisText);
      setDataPoints({
        totalMissions: filtered.length,
        totalExposureMinutes,
        averagePM25: avgPM25,
        maxPM25,
        timeAboveWHO
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

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Date Filter */}
      <DateFilter
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        className="mb-6"
      />

      {/* Statistical Analysis Card */}
      {statisticalAnalysis && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {t('analysis.statisticalAnalysis')}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={regenerateAnalysis}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {loading ? t('analysis.analyzing') : t('analysis.refresh')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 mx-auto text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">{t('analysis.analysisInProgress')}</p>
              </div>
            ) : (
              <>
                <div className="whitespace-pre-line text-sm text-foreground leading-relaxed font-mono">
                  {statisticalAnalysis}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="h-3 w-3 mr-2" />
                    {t('analysis.exportReport')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Points Summary */}
      {dataPoints && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {t('analysis.dataSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dataPoints.totalMissions}</div>
                <div className="text-xs text-muted-foreground">{t('analysis.missions')}</div>
              </div>
              <div className="text-center p-3 bg-accent rounded-lg">
                <div className="text-2xl font-bold text-foreground">{Math.round(dataPoints.totalExposureMinutes / 60)}h</div>
                <div className="text-xs text-muted-foreground">{t('analysis.exposureTime')}</div>
              </div>
              <div className="text-center p-3 bg-air-moderate/10 rounded-lg">
                <div className="text-2xl font-bold text-air-moderate">{Math.round(dataPoints.averagePM25)}</div>
                <div className="text-xs text-muted-foreground">{t('analysis.averagePM25')}</div>
              </div>
              <div className="text-center p-3 bg-air-poor/10 rounded-lg">
                <div className="text-2xl font-bold text-air-poor">{Math.round(dataPoints.timeAboveWHO)}</div>
                <div className="text-xs text-muted-foreground">{t('analysis.minutesAboveWHO')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Activity Analysis */}
      {activityData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {t('analysis.activityAnalysisTitle')}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Label htmlFor="activity-toggle" className="text-sm">
                  <Clock className="h-4 w-4 inline mr-1" />
                  {t('analysis.timeSpent')}
                </Label>
                <Switch
                  id="activity-toggle"
                  checked={showActivityExposure}
                  onCheckedChange={setShowActivityExposure}
                />
                <Label htmlFor="activity-toggle" className="text-sm">
                  <BarChart3 className="h-4 w-4 inline mr-1" />
                  {t('analysis.exposure')}
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityData.map((activity, index) => {
                const maxValue = showActivityExposure 
                  ? Math.max(...activityData.map(a => a.averageExposure))
                  : Math.max(...activityData.map(a => a.timeSpent));
                
                const currentValue = showActivityExposure 
                  ? activity.averageExposure 
                  : activity.timeSpent;
                
                const percentage = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;

                return (
                  <div key={activity.activity} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">
                        {activity.activity}
                      </span>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span>
                          {showActivityExposure 
                            ? `${Math.round(activity.averageExposure)} µg/m³`
                            : `${Math.round(activity.timeSpent / 60)}h ${activity.timeSpent % 60}min`
                          }
                        </span>
                        <span className="text-xs">
                          {activity.measurements} {t('analysis.measurements')}
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WHO Threshold Progress */}
      {dataPoints && (
        <Card>
          <CardHeader>
            <CardTitle>{t('analysis.whoComplianceTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{t('analysis.timeBelowWHO')}</span>
                  <span className="font-medium">
                    {Math.round(((dataPoints.totalExposureMinutes - dataPoints.timeAboveWHO) / dataPoints.totalExposureMinutes) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={((dataPoints.totalExposureMinutes - dataPoints.timeAboveWHO) / dataPoints.totalExposureMinutes) * 100} 
                  className="h-3" 
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('analysis.whoRecommendation')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}