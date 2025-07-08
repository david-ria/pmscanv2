import React, { useState, useEffect, useMemo } from "react";
import { Calendar, Download, Share, Trash2, RotateCcw, WifiOff } from "lucide-react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/StatsCard";
import { DateFilter } from "@/components/DateFilter";
import { useToast } from "@/hooks/use-toast";
import { dataStorage, MissionData } from "@/lib/dataStorage";

export default function History() {
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">("day");
  const { toast } = useToast();

  // Load missions on component mount
  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      setLoading(true);
      const missionData = await dataStorage.getAllMissions();
      setMissions(missionData);
    } catch (error) {
      console.error('Error loading missions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les missions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!navigator.onLine) {
      toast({
        title: "Hors ligne",
        description: "Connexion internet requise pour synchroniser",
        variant: "destructive"
      });
      return;
    }

    try {
      setSyncing(true);
      await dataStorage.syncPendingMissions();
      await loadMissions(); // Reload to show updated sync status
      toast({
        title: "Synchronisation réussie",
        description: "Toutes les données ont été synchronisées"
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser les données",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (missionId: string) => {
    try {
      await dataStorage.deleteMission(missionId);
      setMissions(prev => prev.filter(m => m.id !== missionId));
      toast({
        title: "Mission supprimée",
        description: "La mission a été supprimée avec succès"
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la mission",
        variant: "destructive"
      });
    }
  };

  const getQualityColor = (pm25: number) => {
    if (pm25 <= 12) return "text-air-good";
    if (pm25 <= 35) return "text-air-moderate";
    if (pm25 <= 55) return "text-air-poor";
    return "text-air-very-poor";
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const missionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (missionDate.getTime() === today.getTime()) {
      return "Aujourd'hui";
    } else if (missionDate.getTime() === yesterday.getTime()) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

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

  // Calculate stats from filtered missions
  const periodStats = useMemo(() => {
    if (filteredMissions.length === 0) {
      return [
        { label: "Exposition totale", value: "0 min", color: "default" as const },
        { label: "Moyenne PM2.5", value: 0, unit: "µg/m³", color: "default" as const },
        { label: "PM2.5 > OMS (15)", value: "0 min", color: "default" as const },
        { label: "PM10 > OMS (45)", value: "0 min", color: "default" as const }
      ];
    }

    const totalDuration = filteredMissions.reduce((sum, m) => sum + m.durationMinutes, 0);
    const avgPm25 = filteredMissions.reduce((sum, m) => sum + m.avgPm25, 0) / filteredMissions.length;
    
    // Calculate time above WHO thresholds
    const timeAboveWHO_PM25 = filteredMissions.reduce((sum, m) => {
      return m.avgPm25 > 15 ? sum + m.durationMinutes : sum;
    }, 0);
    
    const timeAboveWHO_PM10 = filteredMissions.reduce((sum, m) => {
      return m.avgPm10 > 45 ? sum + m.durationMinutes : sum;
    }, 0);

    const getColorFromPm25 = (pm25: number) => {
      if (pm25 <= 12) return "good" as const;
      if (pm25 <= 35) return "moderate" as const;
      if (pm25 <= 55) return "poor" as const;
      return "poor" as const;
    };

    const getColorFromTime = (timeAbove: number, totalTime: number) => {
      const percentage = (timeAbove / totalTime) * 100;
      if (percentage <= 10) return "good" as const;
      if (percentage <= 30) return "moderate" as const;
      return "poor" as const;
    };

    return [
      { label: "Exposition totale", value: formatDuration(totalDuration), color: "default" as const },
      { label: "Moyenne PM2.5", value: Math.round(avgPm25), unit: "µg/m³", color: getColorFromPm25(avgPm25) },
      { 
        label: "PM2.5 > OMS (15)", 
        value: formatDuration(timeAboveWHO_PM25), 
        color: getColorFromTime(timeAboveWHO_PM25, totalDuration) 
      },
      { 
        label: "PM10 > OMS (45)", 
        value: formatDuration(timeAboveWHO_PM10), 
        color: getColorFromTime(timeAboveWHO_PM10, totalDuration) 
      }
    ];
  }, [filteredMissions]);

  const unsyncedCount = missions.filter(m => !m.synced).length;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Sync Status */}
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-2">
          {unsyncedCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSync}
              disabled={syncing || !navigator.onLine}
              className="flex items-center gap-2"
            >
              {syncing ? (
                <RotateCcw className="h-4 w-4 animate-spin" />
              ) : navigator.onLine ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <WifiOff className="h-4 w-4" />
              )}
              Sync ({unsyncedCount})
            </Button>
          )}
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
        title={`Résumé - ${selectedPeriod === "day" ? "Jour" : selectedPeriod === "week" ? "Semaine" : selectedPeriod === "month" ? "Mois" : "Année"}`} 
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
            <Card key={mission.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base">{mission.name}</CardTitle>
                      {!mission.synced && (
                        <Badge variant="outline" className="text-xs">
                          Local
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(new Date(mission.startTime))} • {formatDuration(mission.durationMinutes)}
                    </p>
                    {mission.locationContext && mission.activityContext && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {mission.locationContext} • {mission.activityContext}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${getQualityColor(mission.avgPm25)}`}>
                      {Math.round(mission.avgPm25)}
                    </div>
                    <div className="text-xs text-muted-foreground">µg/m³ (moy.)</div>
                    <div className="text-xs text-muted-foreground">
                      {mission.measurementsCount} mesures
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Share className="h-3 w-3 mr-2" />
                    Partager
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="h-3 w-3 mr-2" />
                    Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(mission.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}