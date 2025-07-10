import { useState } from "react";
import { DateFilter } from "@/components/DateFilter";
import { StatisticalAnalysis } from "@/components/Analysis/StatisticalAnalysis";
import { DataSummary } from "@/components/Analysis/DataSummary";
import { ActivityAnalysis } from "@/components/Analysis/ActivityAnalysis";
import { WHOComplianceProgress } from "@/components/Analysis/WHOComplianceProgress";
import { GroupComparison } from "@/components/Analysis/GroupComparison";
import { useAnalysisLogic } from "@/components/Analysis/AnalysisLogic";

export default function Analysis() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">("week");
  const [showActivityExposure, setShowActivityExposure] = useState(false);

  const {
    statisticalAnalysis,
    dataPoints,
    loading,
    activityData,
    regenerateAnalysis
  } = useAnalysisLogic(selectedDate, selectedPeriod);

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
      <StatisticalAnalysis
        statisticalAnalysis={statisticalAnalysis}
        loading={loading}
        onRegenerate={regenerateAnalysis}
      />

      {/* Group Comparison */}
      {dataPoints && (
        <GroupComparison 
          userStats={dataPoints}
          selectedPeriod={selectedPeriod}
          selectedDate={selectedDate}
        />
      )}

      {/* Data Points Summary */}
      {dataPoints && <DataSummary dataPoints={dataPoints} />}

      {/* Activity Analysis */}
      <ActivityAnalysis
        activityData={activityData}
        showActivityExposure={showActivityExposure}
        onToggleExposure={setShowActivityExposure}
      />

      {/* WHO Threshold Progress */}
      {dataPoints && <WHOComplianceProgress dataPoints={dataPoints} />}
    </div>
  );
}