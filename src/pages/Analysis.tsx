import { useState } from 'react';
import { DateFilter } from '@/components/DateFilter';
import { StatisticalAnalysis } from '@/components/Analysis/StatisticalAnalysis';
import { DataSummary } from '@/components/Analysis/DataSummary';
import { GroupComparison } from '@/components/Analysis/GroupComparison';
import { PollutionBreakdownChart } from '@/components/Analysis/PollutionBreakdown';
import { useAnalysisLogic } from '@/components/Analysis/AnalysisLogic';

export default function Analysis() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<
    'day' | 'week' | 'month' | 'year'
  >('day');
  
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
    </div>
  );
}
