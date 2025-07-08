import React, { useState, useEffect, useMemo } from "react";
import { Calendar } from "lucide-react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { StatsCard } from "@/components/StatsCard";
import { DateFilter } from "@/components/DateFilter";
import { MissionCard } from "@/components/History/MissionCard";
import { SyncButton } from "@/components/History/SyncButton";
import { useMissionManagement } from "@/hooks/useMissionManagement";
import { useHistoryStats } from "@/hooks/useHistoryStats";

export default function History() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">("day");
  
  const {
    missions,
    loading,
    syncing,
    loadMissions,
    handleSync,
    handleDelete,
    handleExport,
    handleShare
  } = useMissionManagement();

  // Load missions on component mount
  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  // Filter missions based on selected date and period
  const filteredMissions = useMemo(() => {
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
  }, [missions, selectedDate, selectedPeriod]);

  const periodStats = useHistoryStats(filteredMissions);
  const unsyncedCount = missions.filter(m => !m.synced).length;

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "day": return "Jour";
      case "week": return "Semaine";
      case "month": return "Mois";
      case "year": return "Année";
      default: return "Période";
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Sync Status */}
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-2">
          <SyncButton 
            unsyncedCount={unsyncedCount}
            syncing={syncing}
            onSync={handleSync}
          />
        </div>
      </div>

      {/* Date Filter */}
      <DateFilter
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        className="mb-6"
      />

      {/* Period Stats */}
      <StatsCard 
        title={`Résumé - ${getPeriodLabel()}`} 
        stats={periodStats} 
        className="mb-6" 
      />

      {/* Missions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Missions récentes</h2>
        
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm">Chargement des missions...</p>
          </div>
        ) : filteredMissions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">
              Aucune mission pour cette période
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Sélectionnez une autre date ou période pour voir vos données
            </p>
          </div>
        ) : (
          filteredMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onExport={handleExport}
              onDelete={handleDelete}
              onShare={handleShare}
            />
          ))
        )}
      </div>
    </div>
  );
}