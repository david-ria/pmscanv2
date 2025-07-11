import { User, Settings, Users, Smartphone, AlertTriangle, LogOut, Activity, Languages, Moon, Brain } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleFit } from "@/hooks/useGoogleFit";
import { useLanguage } from "@/hooks/useLanguage";
import { useUserRole } from "@/hooks/useUserRole";
import { useAutoContext } from "@/hooks/useAutoContext";

interface MenuSection {
  title: string;
  items: {
    icon: React.ComponentType<any>;
    label: string;
    badge?: string | null;
    action?: () => void;
    toggle?: {
      checked: boolean;
      onCheckedChange: (checked: boolean) => void;
    };
  }[];
}

interface UseMenuSectionsProps {
  onNavigate: () => void;
  onBackgroundRecording?: () => void;
}

export function useMenuSections({ onNavigate, onBackgroundRecording }: UseMenuSectionsProps): MenuSection[] {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { isAuthenticated, connectGoogleFit, syncActivities } = useGoogleFit();
  const { t } = useTranslation();
  const { currentLanguage, languages } = useLanguage();
  const { userRole } = useUserRole();
  const { isEnabled: autoContextEnabled, toggleEnabled: toggleAutoContext } = useAutoContext();

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

  const handleGroups = () => {
    navigate('/groups');
    onNavigate();
  };

  const getCurrentLanguageDisplay = () => {
    const lang = languages.find(l => l.code === currentLanguage);
    return lang ? lang.name : currentLanguage.toUpperCase();
  };

  const handleBackgroundRecording = () => {
    onBackgroundRecording?.();
  };

  return [
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
        { icon: Languages, label: t('settingsMenu.language'), badge: getCurrentLanguageDisplay() },
        { icon: Moon, label: 'Background Recording', badge: null, action: handleBackgroundRecording },
        { 
          icon: Brain, 
          label: 'Auto Context', 
          badge: null, 
          toggle: {
            checked: autoContextEnabled,
            onCheckedChange: toggleAutoContext
          }
        }
      ]
    },
    // Groups section temporarily hidden
    // {
    //   title: t('groups.title'),
    //   items: [
    //     { icon: Users, label: t('groups.myGroups'), badge: null, action: handleGroups },
    //     ...(userRole === 'super_admin' ? [
    //       { icon: Settings, label: t('groups.adminPanel'), badge: null, action: () => {
    //         navigate('/groups?tab=admin');
    //         onNavigate();
    //       }}
    //     ] : [])
    //   ]
    // },
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
}