import { useState, useEffect } from "react";
import { Brain, MessageSquare, Download, Trophy, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DateFilter } from "@/components/DateFilter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { dataStorage, MissionData } from "@/lib/dataStorage";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";

export default function Analysis() {
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">("week");
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [dataPoints, setDataPoints] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analysisGenerated, setAnalysisGenerated] = useState(false);
  const { toast } = useToast();

  // Load missions on component mount
  useEffect(() => {
    loadMissions();
  }, []);

  // Generate analysis when missions or date filter changes
  useEffect(() => {
    if (missions.length > 0 && !loading) {
      generateAnalysis();
    }
  }, [missions, selectedDate, selectedPeriod]);

  const loadMissions = async () => {
    try {
      const missionData = await dataStorage.getAllMissions();
      setMissions(missionData);
    } catch (error) {
      console.error('Error loading missions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les missions",
        variant: "destructive"
      });
    }
  };

  // Filter missions based on selected date and period
  const filteredMissions = () => {
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
  };

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const filtered = filteredMissions();
      
      if (filtered.length === 0) {
        setAiAnalysis("Aucune donnée disponible pour cette période.\n\nPour obtenir une analyse personnalisée :\n1. Allez sur la page 'Temps réel'\n2. Connectez votre capteur PMScan\n3. Démarrez un enregistrement de quelques minutes\n4. Revenez ici pour voir votre analyse IA !");
        setDataPoints({
          totalMissions: 0,
          totalExposureMinutes: 0,
          averagePM25: 0,
          maxPM25: 0,
          timeAboveWHO: 0
        });
        setAnalysisGenerated(true);
        return;
      }

      const timeframeText = selectedPeriod === "day" ? "la journée" : 
                           selectedPeriod === "week" ? "la semaine" : 
                           selectedPeriod === "month" ? "le mois" : "l'année";

      console.log("Calling edge function with data:", { missionsCount: filtered.length, timeframe: timeframeText });

      const response = await supabase.functions.invoke('analyze-air-quality', {
        body: {
          missions: filtered,
          timeframe: timeframeText
        }
      });

      console.log("Edge function response:", response);

      if (response.error) {
        console.error("Edge function error:", response.error);
        throw new Error(response.error.message || 'Failed to generate analysis');
      }

      if (!response.data) {
        console.error("No data in response:", response);
        throw new Error('No data received from analysis function');
      }

      setAiAnalysis(response.data.analysis || "Analyse non disponible");
      setDataPoints(response.data.dataPoints);
      setAnalysisGenerated(true);

      toast({
        title: "Analyse générée",
        description: "Votre analyse personnalisée est prête"
      });

    } catch (error) {
      console.error('Error generating analysis:', error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'analyse";
      setAiAnalysis(`Erreur lors de la génération de l'analyse: ${errorMessage}. Veuillez réessayer.`);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateAnalysis = () => {
    setAnalysisGenerated(false);
    generateAnalysis();
  };

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

      {/* AI Analysis Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Analyse IA personnalisée
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={regenerateAnalysis}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {loading ? "Analyse..." : "Actualiser"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Analyse en cours...</p>
            </div>
          ) : (
            <>
              <div className="whitespace-pre-line text-sm text-foreground leading-relaxed">
                {aiAnalysis}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  <MessageSquare className="h-3 w-3 mr-2" />
                  Poser une question
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="h-3 w-3 mr-2" />
                  Exporter rapport
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Data Points Summary */}
      {dataPoints && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Résumé des données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dataPoints.totalMissions}</div>
                <div className="text-xs text-muted-foreground">Missions</div>
              </div>
              <div className="text-center p-3 bg-accent rounded-lg">
                <div className="text-2xl font-bold text-foreground">{Math.round(dataPoints.totalExposureMinutes / 60)}h</div>
                <div className="text-xs text-muted-foreground">Temps d'exposition</div>
              </div>
              <div className="text-center p-3 bg-air-moderate/10 rounded-lg">
                <div className="text-2xl font-bold text-air-moderate">{Math.round(dataPoints.averagePM25)}</div>
                <div className="text-xs text-muted-foreground">PM2.5 moyen (μg/m³)</div>
              </div>
              <div className="text-center p-3 bg-air-poor/10 rounded-lg">
                <div className="text-2xl font-bold text-air-poor">{Math.round(dataPoints.timeAboveWHO)}</div>
                <div className="text-xs text-muted-foreground">Min {'>'}= seuil OMS</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WHO Threshold Progress */}
      {dataPoints && (
        <Card>
          <CardHeader>
            <CardTitle>Respect des seuils OMS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Temps sous seuil OMS (15 μg/m³)</span>
                  <span className="font-medium">
                    {Math.round(((dataPoints.totalExposureMinutes - dataPoints.timeAboveWHO) / dataPoints.totalExposureMinutes) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={((dataPoints.totalExposureMinutes - dataPoints.timeAboveWHO) / dataPoints.totalExposureMinutes) * 100} 
                  className="h-3" 
                />
              </div>
              <p className="text-xs text-muted-foreground">
                L'OMS recommande de maintenir l'exposition PM2.5 sous 15 μg/m³ pour protéger la santé.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}