import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DateFilter } from '@/components/DateFilter';
import { StatisticalAnalysis } from '@/components/Analysis/StatisticalAnalysis';
import { DataSummary } from '@/components/Analysis/DataSummary';
import { GroupComparison } from '@/components/Analysis/GroupComparison';
import { CollaborativeMap } from '@/components/Analysis/CollaborativeMap';
import { PollutionBreakdownChart } from '@/components/Analysis/PollutionBreakdown';
import { useAnalysisLogic } from '@/components/Analysis/AnalysisLogic';
import { usePollutionBreakdownData } from '@/components/Analysis/PollutionBreakdown/usePollutionBreakdownData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { calculateMissionStatistics } from '@/utils/missionStatistics';
import { GroupExposureCharts } from '@/components/Analysis/GroupExposureCharts';

export default function Analysis() {
  const { t } = useTranslation();
  const { isGroupMode } = useGroupSettings();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<
    'day' | 'week' | 'month' | 'year'
  >('day');
  const [activeTab, setActiveTab] = useState<'personal' | 'group'>('personal');
  
  // State for breakdown controls
  const [pmType, setPmType] = useState<'pm1' | 'pm25' | 'pm10'>('pm25');
  const [breakdownType, setBreakdownType] = useState<'location' | 'activity' | 'autocontext'>('activity');

  const {
    filteredMissions,
    statisticalAnalysis,
    dataPoints,
    loading,
    loadingMeasurements,
    regenerateAnalysis,
  } = useAnalysisLogic(selectedDate, selectedPeriod, activeTab === 'personal');

  // Compute breakdown data in parent
  const breakdownData = usePollutionBreakdownData(
    filteredMissions,
    selectedPeriod,
    selectedDate,
    breakdownType,
    pmType
  );

  // Calculate user stats using unified statistics utility
  const stats = calculateMissionStatistics(filteredMissions);
  
  const userStats = {
    totalExposureMinutes: stats.totalExposureMinutes,
    averagePM25: stats.avgPm25,
    maxPM25: stats.maxPm25,
    timeAboveWHO: stats.timeAboveWHO_PM25,
  };

  return (
    <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
      {/* Header spacing to match History page layout */}
      <div className="mb-4 sm:mb-6">
        {/* Empty space to align with History page sync button area */}
      </div>

      {/* Date Filter */}
      <DateFilter
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        className="mb-4 sm:mb-6"
      />

      {/* Tabs: Personal / Group */}
      {isGroupMode ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'personal' | 'group')} className="mb-4 sm:mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">{t('analysis.myData')}</TabsTrigger>
            <TabsTrigger value="group">{t('analysis.groupData')}</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 sm:space-y-6">
            {/* Pollution Breakdown Chart */}
            {loadingMeasurements ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            ) : (
              <>
                <PollutionBreakdownChart
                  missions={filteredMissions}
                  selectedPeriod={selectedPeriod}
                  selectedDate={selectedDate}
                  pmType={pmType}
                  breakdownType={breakdownType}
                  onPmTypeChange={setPmType}
                  onBreakdownTypeChange={setBreakdownType}
                />

                {/* Statistical Analysis Report - Temporarily hidden */}
                {/* <StatisticalAnalysis
                  statisticalAnalysis={statisticalAnalysis}
                  loading={loading}
                  onRegenerate={regenerateAnalysis}
                  selectedPeriod={selectedPeriod}
                  selectedDate={selectedDate}
                  breakdownData={breakdownData}
                  pmType={pmType}
                  breakdownType={breakdownType}
                /> */}
              </>
            )}
          </TabsContent>

          <TabsContent value="group" className="space-y-4 sm:space-y-6">
            {/* Group Exposure Statistics */}
            <GroupExposureCharts
              selectedPeriod={selectedPeriod}
              selectedDate={selectedDate}
            />
            
            {/* Collaborative Map */}
            <CollaborativeMap
              selectedPeriod={selectedPeriod}
              selectedDate={selectedDate}
            />
            
            {/* Group Comparison */}
            <GroupComparison
              userStats={userStats}
              selectedPeriod={selectedPeriod}
              selectedDate={selectedDate}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {/* Pollution Breakdown Chart */}
          {loadingMeasurements ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : (
            <>
              <PollutionBreakdownChart
                missions={filteredMissions}
                selectedPeriod={selectedPeriod}
                selectedDate={selectedDate}
                pmType={pmType}
                breakdownType={breakdownType}
                onPmTypeChange={setPmType}
                onBreakdownTypeChange={setBreakdownType}
              />

              {/* Statistical Analysis Report - Temporarily hidden */}
              {/* <StatisticalAnalysis
                statisticalAnalysis={statisticalAnalysis}
                loading={loading}
                onRegenerate={regenerateAnalysis}
                selectedPeriod={selectedPeriod}
                selectedDate={selectedDate}
                breakdownData={breakdownData}
                pmType={pmType}
                breakdownType={breakdownType}
              /> */}
            </>
          )}
        </>
      )}
    </div>
  );
}
