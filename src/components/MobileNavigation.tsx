import { User, Settings, Users, Smartphone, Globe, AlertTriangle, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface MenuSection {
  title: string;
  items: {
    icon: React.ComponentType<any>;
    label: string;
    badge?: string | null;
    to?: string;
  }[];
}

const menuSections: MenuSection[] = [
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

interface MobileNavigationProps {
  onNavigate: () => void;
}

export function MobileNavigation({ onNavigate }: MobileNavigationProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">Paramètres</h2>
        <p className="text-sm text-muted-foreground mt-1">Configuration et compte</p>
      </div>

      {/* User Info Card */}
      <div className="p-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground text-sm">Claire Martin</div>
                <div className="text-xs text-muted-foreground truncate">claire.martin@email.com</div>
                <Badge variant="secondary" className="text-xs mt-1">
                  Coordinatrice
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Menu Sections */}
        <div className="p-4 space-y-6">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="text-sm font-semibold text-foreground mb-3">{section.title}</h3>
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between px-3 py-3 hover:bg-accent/50 transition-colors cursor-pointer rounded-lg min-h-[44px]"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{item.label}</span>
                      </div>
                      {item.badge && (
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            item.badge === "Connecté" && "bg-air-good/10 text-air-good"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-center text-xs text-muted-foreground">
          <p>PMSCAN v1.0.0</p>
          <p className="mt-1">Données sync. 2 min</p>
        </div>
      </div>
    </div>
  );
}