import { Home, History, BarChart3 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface NavigationItem {
  to: string;
  icon: React.ComponentType<any>;
  labelKey: string;
}

const navigationItems: NavigationItem[] = [
  { to: "/", icon: Home, labelKey: "navigation.realTime" },
  { to: "/history", icon: History, labelKey: "navigation.history" },
  { to: "/analysis", icon: BarChart3, labelKey: "navigation.analysis" },
];

export function BottomNavigation() {
  const { t } = useTranslation();
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
              <span className="text-xs font-medium leading-tight">{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}