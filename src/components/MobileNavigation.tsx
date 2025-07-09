import { User, Settings, Users, Smartphone, Globe, AlertTriangle, LogOut, Activity, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useGoogleFit } from "@/hooks/useGoogleFit";
import { useLanguage } from "@/hooks/useLanguage";

interface MenuSection {
  title: string;
  items: {
    icon: React.ComponentType<any>;
    label: string;
    badge?: string | null;
    action?: () => void;
  }[];
}

interface MobileNavigationProps {
  onNavigate: () => void;
}

export function MobileNavigation({ onNavigate }: MobileNavigationProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAuthenticated, connectGoogleFit, syncActivities, isLoading } = useGoogleFit();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, languages } = useLanguage();

  const handleProfileClick = () => {
    navigate('/profile');
    onNavigate();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    onNavigate();
  };

  const handleGoogleFitConnect = async () => {
    try {
      console.log('Attempting to connect to Google Fit...');
      await connectGoogleFit();
      console.log('Google Fit connection successful');
    } catch (error) {
      console.error('Error connecting to Google Fit:', error);
      // Show more detailed error information
      alert(`Google Fit connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleGoogleFitSync = async () => {
    try {
      console.log('Attempting to sync Google Fit activities...');
      await syncActivities();
      console.log('Google Fit sync successful');
    } catch (error) {
      console.error('Error syncing Google Fit:', error);
      alert(`Google Fit sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCustomThresholds = () => {
    navigate('/custom-thresholds');
    onNavigate();
  };

  const handleCustomAlerts = () => {
    navigate('/custom-alerts');
    onNavigate();
  };

  const getCurrentLanguageDisplay = () => {
    const lang = languages.find(l => l.code === currentLanguage);
    return lang ? lang.name : currentLanguage.toUpperCase();
  };

  const menuSections: MenuSection[] = [
    {
      title: t('account.title'),
      items: [
        { icon: User, label: t('account.profile'), badge: null, action: handleProfileClick },
        { icon: LogOut, label: t('account.logout'), badge: null, action: handleSignOut }
      ]
    },
    {
      title: t('settingsMenu.title'),
      items: [
        { icon: Settings, label: t('settingsMenu.customThresholds'), badge: null, action: handleCustomThresholds },
        { icon: AlertTriangle, label: t('settingsMenu.alertsAlarms'), badge: null, action: handleCustomAlerts },
        { icon: Languages, label: t('settingsMenu.language'), badge: getCurrentLanguageDisplay() }
      ]
    },
    {
      title: t('community.title'),
      items: [
        { icon: Users, label: t('community.joinGroup'), badge: null },
        { icon: Users, label: t('community.healthNeighborhood'), badge: `23 ${t('community.members')}` }
      ]
    },
    {
      title: t('sensors.title'),
      items: [
        { icon: Smartphone, label: t('sensors.pmscan'), badge: t('sensors.connected') },
        { icon: Smartphone, label: t('sensors.native'), badge: null },
        { 
          icon: Activity, 
          label: t('sensors.googleFit'), 
          badge: isAuthenticated ? t('sensors.connected') : null,
          action: isAuthenticated ? handleGoogleFitSync : handleGoogleFitConnect
        }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">{t('settings.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('settings.subtitle')}</p>
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
                <div className="font-medium text-foreground text-sm">
                  {user?.email || t('account.user')}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </div>
                <Badge variant="secondary" className="text-xs mt-1">
                  {t('account.connected')}
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
                  const isLanguageItem = item.label === t('settingsMenu.language');
                  
                  if (isLanguageItem) {
                    return (
                      <DropdownMenu key={itemIndex}>
                        <DropdownMenuTrigger asChild>
                          <div className="flex items-center justify-between px-3 py-3 hover:bg-accent/50 transition-colors cursor-pointer rounded-lg min-h-[44px]">
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">{item.label}</span>
                            </div>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {languages.map((lang) => (
                            <DropdownMenuItem
                              key={lang.code}
                              onClick={() => changeLanguage(lang.code)}
                              className={cn(
                                "cursor-pointer",
                                currentLanguage === lang.code && "bg-accent"
                              )}
                            >
                              <span className="text-sm">{lang.name}</span>
                              {currentLanguage === lang.code && (
                                <span className="ml-auto text-xs text-muted-foreground">✓</span>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }
                  
                  return (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between px-3 py-3 hover:bg-accent/50 transition-colors cursor-pointer rounded-lg min-h-[44px]"
                      onClick={item.action}
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
                            item.badge === t('sensors.connected') && "bg-air-good/10 text-air-good"
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
          <p>{t('settings.appVersion')}</p>
          <p className="mt-1">{t('settings.dataSync')}</p>
        </div>
      </div>
    </div>
  );
}