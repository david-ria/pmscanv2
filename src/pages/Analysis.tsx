import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateFilter } from '@/components/DateFilter';
import { StatisticalAnalysis } from '@/components/Analysis/StatisticalAnalysis';
import { DataSummary } from '@/components/Analysis/DataSummary';
import { GroupComparison } from '@/components/Analysis/GroupComparison';
import { CollaborativeMap } from '@/components/Analysis/CollaborativeMap';
import { PollutionBreakdownChart } from '@/components/Analysis/PollutionBreakdown';
import { useAnalysisLogic } from '@/components/Analysis/AnalysisLogic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroupSettings } from '@/hooks/useGroupSettings';

export default function Analysis() {
  const { t } = useTranslation();
  const { isGroupMode } = useGroupSettings();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<
    'day' | 'week' | 'month' | 'year'
  >('day');
  const [activeTab, setActiveTab] = useState<'personal' | 'group'>('personal');
  
  // State for breakdown data from PollutionBreakdownChart
  const [breakdownData, setBreakdownData] = useState<any[]>([]);
  const [pmType, setPmType] = useState<'pm1' | 'pm25' | 'pm10'>('pm25');
  const [breakdownType, setBreakdownType] = useState<string>('activity');

  const {
    missions,
    statisticalAnalysis,
    dataPoints,
    loading,
    regenerateAnalysis,
  } = useAnalysisLogic(selectedDate, selectedPeriod);

  // Calculate user stats for GroupComparison
  const userStats = {
    totalExposureMinutes: missions.reduce((sum, m) => sum + (m.durationMinutes || 0), 0),
    averagePM25: missions.length > 0 
      ? missions.reduce((sum, m) => sum + m.avgPm25, 0) / missions.length 
      : 0,
    maxPM25: missions.length > 0 
      ? Math.max(...missions.map(m => m.maxPm25)) 
      : 0,
    timeAboveWHO: 0, // TODO: Calculate from measurements if needed
  };

  const handleBreakdownDataChange = (data: {
    breakdownData: any[];
    pmType: 'pm1' | 'pm25' | 'pm10';
    breakdownType: string;
  }) => {
    setBreakdownData(data.breakdownData);
    setPmType(data.pmType);
    setBreakdownType(data.breakdownType);
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
            <PollutionBreakdownChart
              missions={missions}
              selectedPeriod={selectedPeriod}
              selectedDate={selectedDate}
              onBreakdownDataChange={handleBreakdownDataChange}
            />

            {/* Statistical Analysis Report */}
            <StatisticalAnalysis
              statisticalAnalysis={statisticalAnalysis}
              loading={loading}
              onRegenerate={regenerateAnalysis}
              selectedPeriod={selectedPeriod}
              selectedDate={selectedDate}
              breakdownData={breakdownData}
              pmType={pmType}
              breakdownType={breakdownType}
            />
          </TabsContent>

          <TabsContent value="group" className="space-y-4 sm:space-y-6">
            {/* Group Comparison */}
            <GroupComparison
              userStats={userStats}
              selectedPeriod={selectedPeriod}
              selectedDate={selectedDate}
            />
            
            {/* Collaborative Map */}
            <CollaborativeMap
              selectedPeriod={selectedPeriod}
              selectedDate={selectedDate}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {/* Pollution Breakdown Chart */}
          <PollutionBreakdownChart
            missions={missions}
            selectedPeriod={selectedPeriod}
            selectedDate={selectedDate}
            onBreakdownDataChange={handleBreakdownDataChange}
          />

          {/* Statistical Analysis Report */}
          <StatisticalAnalysis
            statisticalAnalysis={statisticalAnalysis}
            loading={loading}
            onRegenerate={regenerateAnalysis}
            selectedPeriod={selectedPeriod}
            selectedDate={selectedDate}
            breakdownData={breakdownData}
            pmType={pmType}
            breakdownType={breakdownType}
          />
        </>
      )}
    </div>
  );
}
