import { Home, History, BarChart3, Menu } from "lucide-react";
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
  { to: "/menu", icon: Menu, label: "Menu" },
];

export function NavigationBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center space-y-1 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}