import { User, Settings, Users, Smartphone, Globe, AlertTriangle, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Menu() {
  const menuSections = [
    {
      title: "Compte",
      items: [
        { icon: User, label: "Mon profil", badge: null },
        { icon: LogOut, label: "Déconnexion", badge: null }
      ]
    },
    {
      title: "Paramètres",
      items: [
        { icon: Settings, label: "Seuils personnalisés", badge: null },
        { icon: AlertTriangle, label: "Alertes & alarmes", badge: "3" },
        { icon: Globe, label: "Langue", badge: "FR" }
      ]
    },
    {
      title: "Communauté",
      items: [
        { icon: Users, label: "Rejoindre un groupe", badge: null },
        { icon: Users, label: "Quartier Santé Respire", badge: "23 membres" }
      ]
    },
    {
      title: "Capteurs",
      items: [
        { icon: Smartphone, label: "Capteur PMSCAN", badge: "Connecté" },
        { icon: Smartphone, label: "Capteurs natifs", badge: null }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Menu</h1>
        <p className="text-sm text-muted-foreground">Paramètres et configuration</p>
      </div>

      {/* User Info Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Claire Martin</div>
              <div className="text-sm text-muted-foreground">claire.martin@email.com</div>
              <Badge variant="secondary" className="text-xs mt-1">
                Coordinatrice groupe
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Sections */}
      <div className="space-y-6">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h2 className="text-lg font-semibold text-foreground mb-3">{section.title}</h2>
            <Card>
              <CardContent className="p-0">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-foreground">{item.label}</span>
                      </div>
                      {item.badge && (
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            item.badge === "Connecté" ? "bg-air-good/10 text-air-good" : ""
                          }`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* App Info */}
      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>PMSCAN v1.0.0</p>
        <p className="mt-1">Données synchronisées il y a 2 min</p>
      </div>
    </div>
  );
}