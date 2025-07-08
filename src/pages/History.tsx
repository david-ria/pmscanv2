import { Calendar, Download, Share, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";

export default function History() {
  const missions = [
    {
      id: 1,
      name: "Trajet école matin",
      duration: "12 min",
      avgPM25: 28,
      date: "Aujourd'hui",
      photo: null
    },
    {
      id: 2,
      name: "Sortie parc dimanche",
      duration: "1h 34min",
      avgPM25: 8,
      date: "Hier",
      photo: null
    },
    {
      id: 3,
      name: "Livraison boulangerie",
      duration: "45 min",
      avgPM25: 42,
      date: "12 Jan",
      photo: null
    }
  ];

  const todayStats = [
    { label: "Exposition totale", value: "4h 12m", color: "default" as const },
    { label: "Moyenne PM2.5", value: 22, unit: "µg/m³", color: "moderate" as const },
    { label: "Pic maximum", value: 45, unit: "µg/m³", color: "poor" as const },
    { label: "Missions", value: 3, color: "default" as const }
  ];

  const getQualityColor = (pm25: number) => {
    if (pm25 <= 12) return "text-air-good";
    if (pm25 <= 35) return "text-air-moderate";
    return "text-air-poor";
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historique</h1>
          <p className="text-sm text-muted-foreground">Vos mesures passées</p>
        </div>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Calendrier
        </Button>
      </div>

      {/* Today's Stats */}
      <StatsCard title="Résumé d'aujourd'hui" stats={todayStats} className="mb-6" />

      {/* Missions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Missions récentes</h2>
        
        {missions.map((mission) => (
          <Card key={mission.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{mission.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{mission.date} • {mission.duration}</p>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${getQualityColor(mission.avgPM25)}`}>
                    {mission.avgPM25}
                  </div>
                  <div className="text-xs text-muted-foreground">µg/m³</div>
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
                <Button variant="outline" size="sm">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {missions.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
          <p className="text-muted-foreground">Aucune mission enregistrée</p>
          <p className="text-sm text-muted-foreground mt-2">
            Commencez votre première mesure depuis l'écran Temps réel
          </p>
        </div>
      )}
    </div>
  );
}