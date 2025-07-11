import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface DataSummaryHeaderProps {
  dataPoints: {
    totalMissions: number;
    totalExposureMinutes: number;
    averagePM25: number;
    timeAboveWHO: number;
  } | null;
}

export const DataSummaryHeader = ({ dataPoints }: DataSummaryHeaderProps) => {
  const { t } = useTranslation();

  if (!dataPoints) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="text-sm">📊 Résumé des données</span>
            <span>Aucune donnée disponible pour cette période</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    }
    return `${mins}min`;
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-primary font-medium">📊 Résumé des données</span>
          </div>
          
          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-lg">
            <span className="font-bold text-green-700 dark:text-green-300 text-lg">{dataPoints.totalMissions}</span>
            <span className="text-green-600 dark:text-green-400 text-xs">Missions</span>
          </div>

          <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">
            <span className="font-bold text-blue-700 dark:text-blue-300 text-lg">{formatDuration(dataPoints.totalExposureMinutes)}</span>
            <span className="text-blue-600 dark:text-blue-400 text-xs">Temps d'exposition</span>
          </div>

          <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-lg">
            <span className="font-bold text-orange-700 dark:text-orange-300 text-lg">{formatDuration(dataPoints.timeAboveWHO)}</span>
            <span className="text-orange-600 dark:text-orange-400 text-xs">Min {'>'}seuil OMS</span>
          </div>

          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-lg">
            <span className="font-bold text-yellow-700 dark:text-yellow-300 text-lg">{Math.round(dataPoints.averagePM25)}</span>
            <span className="text-yellow-600 dark:text-yellow-400 text-xs">PM2.5 moyen (μg/m³)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};