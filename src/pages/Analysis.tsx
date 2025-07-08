import { Brain, MessageSquare, Download, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function Analysis() {
  const aiAnalysis = `Votre exposition aux particules fines cette semaine montre des pics récurrents lors de vos trajets matinaux vers l'école (entre 8h00 et 8h30). 

Les mesures indiquent une concentration moyenne de PM2.5 de 28µg/m³ pendant ces trajets, soit 2,3 fois supérieure aux recommandations OMS.

Recommandations :
• Privilégier l'itinéraire par la rue du Parc (-35% d'exposition)
• Éviter les heures de pointe (7h45-8h15)
• Considérer le transport scolaire collectif

Impact positif observé : vos sorties au parc le weekend maintiennent une excellente qualité d'air (8µg/m³ en moyenne).`;

  const groupRanking = {
    position: 12,
    total: 23,
    percentile: 48
  };

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analyse IA</h1>
          <p className="text-sm text-muted-foreground">Insights personnalisés</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          <Brain className="h-3 w-3 mr-1" />
          Nouvelle analyse
        </Badge>
      </div>

      {/* AI Analysis Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Analyse hebdomadaire
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Group Ranking */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Classement groupe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-foreground">
              #{groupRanking.position}
            </div>
            <div className="text-sm text-muted-foreground">
              sur {groupRanking.total} membres
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Exposition relative</span>
              <span className="font-medium">{groupRanking.percentile}e percentile</span>
            </div>
            <Progress value={groupRanking.percentile} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Vous êtes exposé à un niveau modéré par rapport aux autres membres du groupe
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Tendances cette semaine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-air-good/10 rounded-lg">
              <div className="text-2xl font-bold text-air-good">-15%</div>
              <div className="text-xs text-muted-foreground">Exposition vs semaine dernière</div>
            </div>
            <div className="text-center p-3 bg-air-moderate/10 rounded-lg">
              <div className="text-2xl font-bold text-air-moderate">3</div>
              <div className="text-xs text-muted-foreground">Alertes déclenchées</div>
            </div>
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">85%</div>
              <div className="text-xs text-muted-foreground">Temps en zone verte</div>
            </div>
            <div className="text-center p-3 bg-accent rounded-lg">
              <div className="text-2xl font-bold text-foreground">12h</div>
              <div className="text-xs text-muted-foreground">Temps d'exposition total</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}