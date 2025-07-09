import { Home, History, BarChart3 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavigationItem {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
}

const navigationItems: NavigationItem[] = [
  { to: "/", icon: Home, label: "Temps réel" },
  { to: "/history", icon: History, label: "Historique" },
  { to: "/analysis", icon: BarChart3, label: "Analyse" },
];

export function BottomNavigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border z-50 safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center space-y-1 px-4 py-2 rounded-lg transition-colors min-w-[70px] min-h-[44px]",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium leading-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}