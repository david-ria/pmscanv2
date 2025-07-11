import { useState } from "react";
import { DateFilter } from "@/components/DateFilter";
import { StatisticalAnalysis } from "@/components/Analysis/StatisticalAnalysis";
import { DataSummary } from "@/components/Analysis/DataSummary";
import { GroupComparison } from "@/components/Analysis/GroupComparison";
import { DataSummaryHeader } from "@/components/Analysis/DataSummaryHeader";
import { PollutionBreakdownChart } from "@/components/Analysis/PollutionBreakdown";
import { useAnalysisLogic } from "@/components/Analysis/AnalysisLogic";

export default function Analysis() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">("week");
  const {
    missions,
    statisticalAnalysis,
    dataPoints,
    loading,
    regenerateAnalysis
  } = useAnalysisLogic(selectedDate, selectedPeriod);

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

      {/* Data Summary Header */}
      <DataSummaryHeader dataPoints={dataPoints} />

      {/* Pollution Breakdown Chart */}
      <PollutionBreakdownChart 
        missions={missions}
        selectedPeriod={selectedPeriod}
        selectedDate={selectedDate}
      />

      {/* Statistical Analysis Report */}
      <StatisticalAnalysis
        statisticalAnalysis={statisticalAnalysis}
        loading={loading}
        onRegenerate={regenerateAnalysis}
      />
    </div>
  );
}