import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { dataStorage, MissionData } from '@/lib/dataStorage';
import { useMissionEnrichment } from './useMissionEnrichment';

export function useMissionManagement() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [missions, setMissions] = useState<MissionData[]>([]);
  const { toast } = useToast();
  const { enrichAllMissionsWithMissingData } = useMissionEnrichment();

  const loadMissions = useCallback(async () => {
    try {
      setLoading(true);
      const missionData = await dataStorage.getAllMissions();
      setMissions(missionData);
    } catch (error) {
      console.error('Error loading missions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les missions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSync = useCallback(async () => {
    if (!navigator.onLine) {
      toast({
        title: 'Hors ligne',
        description: 'Connexion internet requise pour synchroniser',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSyncing(true);
      await dataStorage.syncPendingMissions();
      await loadMissions();
      toast({
        title: 'Synchronisation réussie',
        description: 'Toutes les données ont été synchronisées',
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: 'Erreur de synchronisation',
        description: 'Impossible de synchroniser les données',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  }, [loadMissions, toast]);

  const handleDelete = useCallback(
    async (missionId: string) => {
      try {
        await dataStorage.deleteMission(missionId);
        setMissions((prev) => prev.filter((m) => m.id !== missionId));
        toast({
          title: 'Mission supprimée',
          description: 'La mission a été supprimée avec succès',
        });
      } catch (error) {
        console.error('Delete error:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de supprimer la mission',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const handleExport = useCallback(
    async (mission: MissionData) => {
      try {
        await dataStorage.exportMissionToCSV(mission);
        toast({
          title: 'Export réussi',
          description: `"${mission.name}" exporté en CSV`,
        });
      } catch (error) {
        console.error('Export error:', error);
        toast({
          title: "Erreur d'export",
          description: "Impossible d'exporter la mission",
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const handleShare = useCallback(
    async (mission: MissionData, shareType: 'email' | 'sms' | 'native') => {
      const formatDate = (date: Date) => {
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const missionDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );

        if (missionDate.getTime() === today.getTime()) {
          return "Aujourd'hui";
        } else if (missionDate.getTime() === yesterday.getTime()) {
          return 'Hier';
        } else {
          return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          });
        }
      };

      const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
          return `${hours}h ${mins}min`;
        }
        return `${mins} min`;
      };

      const shareText = `Mission PMScan: ${mission.name}
Date: ${formatDate(new Date(mission.startTime))}
Durée: ${formatDuration(mission.durationMinutes)}
PM2.5 moyenne: ${Math.round(mission.avgPm25)} µg/m³
${mission.locationContext ? `Lieu: ${mission.locationContext}` : ''}
${mission.activityContext ? `Activité: ${mission.activityContext}` : ''}`;

      try {
        if (shareType === 'native' && navigator.share) {
          await navigator.share({
            title: `Mission PMScan: ${mission.name}`,
            text: shareText,
          });
          toast({
            title: 'Partagé',
            description: 'Mission partagée avec succès',
          });
        } else if (shareType === 'email') {
          const emailSubject = encodeURIComponent(
            `Mission PMScan: ${mission.name}`
          );
          const emailBody = encodeURIComponent(shareText);
          window.open(`mailto:?subject=${emailSubject}&body=${emailBody}`);
        } else if (shareType === 'sms') {
          const smsBody = encodeURIComponent(shareText);
          window.open(`sms:?body=${smsBody}`);
        } else {
          await navigator.clipboard.writeText(shareText);
          toast({
            title: 'Copié',
            description: 'Données copiées dans le presse-papiers',
          });
        }
      } catch (error) {
        console.error('Share error:', error);
        try {
          await navigator.clipboard.writeText(shareText);
          toast({
            title: 'Copié',
            description: 'Données copiées dans le presse-papiers',
          });
        } catch (clipboardError) {
          toast({
            title: 'Erreur de partage',
            description: 'Impossible de partager la mission',
            variant: 'destructive',
          });
        }
      }
    },
    [toast]
  );

  const handleEnrichMissions = useCallback(async () => {
    if (!navigator.onLine) {
      toast({
        title: 'Hors ligne',
        description: 'Connexion internet requise pour enrichir les missions',
        variant: 'destructive',
      });
      return;
    }

    try {
      await enrichAllMissionsWithMissingData();
      await loadMissions();
    } catch (error) {
      console.error('Enrichment error:', error);
      toast({
        title: 'Erreur d\'enrichissement',
        description: 'Impossible d\'enrichir les missions',
        variant: 'destructive',
      });
    }
  }, [enrichAllMissionsWithMissingData, loadMissions, toast]);

  return {
    missions,
    loading,
    syncing,
    loadMissions,
    handleSync,
    handleDelete,
    handleExport,
    handleShare,
    handleEnrichMissions,
  };
}
