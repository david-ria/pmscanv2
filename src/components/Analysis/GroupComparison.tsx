import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, AlertTriangle, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useGroupSettings } from "@/hooks/useGroupSettings";

interface GroupStatistics {
  user_id: string;
  avg_pm25: number;
  avg_pm10: number;
  avg_pm1: number;
  total_duration_minutes: number;
  total_measurements: number;
  max_pm25: number;
  date: string;
}

interface GroupComparisonProps {
  userStats: {
    totalExposureMinutes: number;
    averagePM25: number;
    maxPM25: number;
    timeAboveWHO: number;
  };
  selectedPeriod: "day" | "week" | "month" | "year";
  selectedDate: Date;
}

export const GroupComparison = ({ userStats, selectedPeriod, selectedDate }: GroupComparisonProps) => {
  const { t } = useTranslation();
  const { activeGroup, isGroupMode } = useGroupSettings();
  const [groupStats, setGroupStats] = useState<GroupStatistics[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isGroupMode && activeGroup) {
      loadGroupStatistics();
    }
  }, [isGroupMode, activeGroup, selectedPeriod, selectedDate]);

  const loadGroupStatistics = async () => {
    if (!activeGroup) return;
    
    setLoading(true);
    try {
      // For now, we'll simulate group data since there's no actual group system in Supabase yet
      // In a real implementation, you would fetch from group_shared_statistics table
      
      // Simulate some group members with different exposure patterns
      const mockGroupStats: GroupStatistics[] = [
        {
          user_id: "user-1",
          avg_pm25: userStats.averagePM25 * 0.8, // 20% less exposed
          avg_pm10: userStats.averagePM25 * 1.5 * 0.8,
          avg_pm1: userStats.averagePM25 * 0.6 * 0.8,
          total_duration_minutes: userStats.totalExposureMinutes * 1.2,
          total_measurements: 150,
          max_pm25: userStats.maxPM25 * 0.7,
          date: selectedDate.toISOString().split('T')[0]
        },
        {
          user_id: "user-2", 
          avg_pm25: userStats.averagePM25 * 1.3, // 30% more exposed
          avg_pm10: userStats.averagePM25 * 1.5 * 1.3,
          avg_pm1: userStats.averagePM25 * 0.6 * 1.3,
          total_duration_minutes: userStats.totalExposureMinutes * 0.9,
          total_measurements: 200,
          max_pm25: userStats.maxPM25 * 1.4,
          date: selectedDate.toISOString().split('T')[0]
        },
        {
          user_id: "user-3",
          avg_pm25: userStats.averagePM25 * 0.9, // 10% less exposed
          avg_pm10: userStats.averagePM25 * 1.5 * 0.9,
          avg_pm1: userStats.averagePM25 * 0.6 * 0.9,
          total_duration_minutes: userStats.totalExposureMinutes * 1.1,
          total_measurements: 120,
          max_pm25: userStats.maxPM25 * 0.85,
          date: selectedDate.toISOString().split('T')[0]
        }
      ];

      setGroupStats(mockGroupStats);
    } catch (error) {
      console.error('Error loading group statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isGroupMode || !activeGroup) {
    return null;
  }

  const groupAverage = groupStats.length > 0 
    ? groupStats.reduce((sum, stat) => sum + stat.avg_pm25, 0) / groupStats.length 
    : 0;

  const userVsGroupRatio = groupAverage > 0 ? userStats.averagePM25 / groupAverage : 1;
  const isAboveAverage = userVsGroupRatio > 1;
  const percentageDiff = Math.abs((userVsGroupRatio - 1) * 100);

  const getComparisonStatus = () => {
    if (percentageDiff < 5) return { label: t('analysis.groupComparison.similar'), color: 'bg-green-500', icon: Target };
    if (isAboveAverage) return { label: t('analysis.groupComparison.higher'), color: 'bg-red-500', icon: TrendingUp };
    return { label: t('analysis.groupComparison.lower'), color: 'bg-green-500', icon: TrendingDown };
  };

  const status = getComparisonStatus();
  const StatusIcon = status.icon;

  const getInsights = () => {
    const insights = [];
    
    if (isAboveAverage) {
      insights.push("• " + t('analysis.groupComparison.insights.higherExposure'));
      insights.push("• " + t('analysis.groupComparison.insights.checkActivities'));
      insights.push("• " + t('analysis.groupComparison.insights.avoidPeakTimes'));
    } else {
      insights.push("• " + t('analysis.groupComparison.insights.lowerExposure'));
      insights.push("• " + t('analysis.groupComparison.insights.goodPractices'));
      insights.push("• " + t('analysis.groupComparison.insights.shareKnowledge'));
    }
    
    return insights;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('analysis.groupComparison.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-muted-foreground">{t('analysis.groupComparison.loading')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('analysis.groupComparison.title')}
          </CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {Math.round(userStats.averagePM25)} μg/m³
            </div>
            <div className="text-sm text-muted-foreground">{t('analysis.groupComparison.yourAverage')}</div>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {Math.round(groupAverage)} μg/m³
            </div>
            <div className="text-sm text-muted-foreground">{t('analysis.groupComparison.groupAverage')}</div>
          </div>
          <div className="text-center p-4 bg-accent rounded-lg">
            <div className={`text-2xl font-bold ${isAboveAverage ? 'text-red-600' : 'text-green-600'}`}>
              {isAboveAverage ? '+' : '-'}{Math.round(percentageDiff)}%
            </div>
            <div className="text-sm text-muted-foreground">{t('analysis.groupComparison.difference')}</div>
          </div>
        </div>

        {/* Group Members Comparison */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">{t('analysis.groupComparison.memberComparison')}</h4>
          {groupStats.map((member, index) => {
            const memberRatio = member.avg_pm25 / Math.max(groupAverage, 1);
            const isCurrentUser = index === 0; // Simulate current user being first in comparison
            
            return (
              <div key={member.user_id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {isCurrentUser ? t('analysis.groupComparison.you') : `${t('analysis.groupComparison.member')} ${index + 1}`}
                    {isCurrentUser && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {t('analysis.groupComparison.you')}
                      </Badge>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(member.avg_pm25)} μg/m³
                  </span>
                </div>
                <Progress 
                  value={Math.min((memberRatio * 50), 100)} 
                  className="h-2"
                />
              </div>
            );
          })}
        </div>

        {/* Insights */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('analysis.groupComparison.insights.title')}
          </h4>
          <div className="text-sm text-muted-foreground space-y-1">
            {getInsights().map((insight, index) => (
              <div key={index}>{insight}</div>
            ))}
          </div>
        </div>

        {/* Group Context */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
          {t('analysis.groupComparison.groupContext', { groupName: activeGroup.name })}
        </div>
      </CardContent>
    </Card>
  );
};