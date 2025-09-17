import { Home, History, BarChart3, Users, LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

interface NavigationItem {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  requiresSuperAdmin?: boolean;
}

const allNavigationItems: NavigationItem[] = [
  { to: '/', icon: Home, labelKey: 'navigation.realTime' },
  { to: '/history', icon: History, labelKey: 'navigation.history' },
  { to: '/analysis', icon: BarChart3, labelKey: 'navigation.analysis' },
  { to: '/groups', icon: Users, labelKey: 'navigation.groups', requiresSuperAdmin: true },
];

export function BottomNavigation() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useUserRole();

  // Filter navigation items based on user role
  const navigationItems = allNavigationItems.filter(item => {
    if (item.requiresSuperAdmin) {
      return isSuperAdmin;
    }
    return true;
  });
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border z-[60] safe-area-pb">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`${item.to === '/' ? 'scan' : item.to.slice(1)}-tab`}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center space-y-1 px-4 py-2 rounded-lg transition-colors min-w-[70px] min-h-[44px]',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium leading-tight">
                {t(item.labelKey)}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
