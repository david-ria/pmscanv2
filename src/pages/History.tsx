import React, { useState, useEffect, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
} from 'date-fns';
import { StatsCard } from '@/components/StatsCard';
import { DateFilter } from '@/components/DateFilter';
import { MissionCard } from '@/components/History/MissionCard';
import { useMissionManagement } from '@/hooks/useMissionManagement';
import { useHistoryStats } from '@/hooks/useHistoryStats';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function History() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<
    'day' | 'week' | 'month' | 'year'
  >('week');
  const [showAllMissions, setShowAllMissions] = useState(false);

  const {
    missions,
    loading,
    syncing,
    loadMissions,
    handleSync,
    handleSingleSync,
    handleDelete,
    handleExport,
    handleShare,
  } = useMissionManagement(user?.id);

  // Load missions on component mount
  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  // Filter missions based on selected date and period
  const filteredMissions = useMemo(() => {
    // If showing all missions, skip filtering
    if (showAllMissions) {
      return missions;
    }

    let startDate: Date;
    let endDate: Date;

    switch (selectedPeriod) {
      case 'day':
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
        break;
      case 'week':
        startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
        break;
      case 'year':
        startDate = startOfYear(selectedDate);
        endDate = endOfYear(selectedDate);
        break;
      default:
        return missions;
    }

    return missions.filter((mission) => {
      // Ensure startTime is a Date object (it might be a string from JSON)
      const missionDate = mission.startTime instanceof Date 
        ? mission.startTime 
        : new Date(mission.startTime);
      
      // Check if valid date
      if (isNaN(missionDate.getTime())) {
        console.warn('Invalid mission date:', mission.startTime);
        return false;
      }
      
      return isWithinInterval(missionDate, { start: startDate, end: endDate });
    });
  }, [missions, selectedDate, selectedPeriod, showAllMissions]);

  // Reset showAllMissions when date filter changes
  useEffect(() => {
    setShowAllMissions(false);
  }, [selectedDate, selectedPeriod]);

  const periodStats = useHistoryStats(filteredMissions);
  const unsyncedCount = missions.filter((m) => !m.synced).length;

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'day':
        return t('history.periods.day');
      case 'week':
        return t('history.periods.week');
      case 'month':
        return t('history.periods.month');
      case 'year':
        return t('history.periods.year');
      default:
        return 'Période';
    }
  };

  return (
    <main role="main" className="min-h-screen bg-background px-4 py-6">
      <h1 className="text-3xl font-bold text-foreground mb-6">
        {t('history.title')}
      </h1>

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
        title={`${t('history.summary')} - ${showAllMissions ? t('history.allMissions') : getPeriodLabel()}`}
        stats={periodStats}
        className="mb-6"
      />

      {/* Missions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t('history.recentMissions')}
        </h2>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm">{t('history.loadingMissions')}</p>
          </div>
        ) : filteredMissions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">
              {t('history.noMissionsForPeriod')}
            </p>
            {missions.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('history.totalMissionsAvailable', { count: missions.length })}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowAllMissions(true)}
                >
                  {t('history.showAllMissions')}
                </Button>
              </>
            )}
            {missions.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('history.selectAnotherDate')}
              </p>
            )}
          </div>
        ) : (
          filteredMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onExport={handleExport}
              onDelete={handleDelete}
              onShare={handleShare}
              onSync={handleSingleSync}
              syncing={syncing}
            />
          ))
        )}
      </div>
    </main>
  );
}
