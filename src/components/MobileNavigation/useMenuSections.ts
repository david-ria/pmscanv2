import {
  User,
  Settings,
  Smartphone,
  AlertTriangle,
  LogOut,
  Activity,
  Languages,
  Moon,
  Brain,
  SunMoon,
  MapPin,
  Bluetooth,
  Cloud,
  MapPin as MapPinIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserRole } from '@/hooks/useUserRole';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useBackgroundRecordingIntegration } from '@/hooks/useBackgroundRecordingIntegration';
import { useUnifiedData } from '@/components/UnifiedDataProvider';
import { useGPS } from '@/hooks/useGPS';
import { useWeatherLogging } from '@/hooks/useWeatherLogging';
import { useLocationEnrichmentSettings } from '@/hooks/useLocationEnrichmentSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { LucideIcon } from 'lucide-react';

interface MenuSection {
  title: string;
  items: {
    icon: LucideIcon;
    label: string;
    badge?: string | null;
    action?: () => void;
    toggle?: {
      checked: boolean;
      onCheckedChange: (checked: boolean) => void;
    };
    info?: string;
    isPremiumFeature?: boolean;
  }[];
}

interface UseMenuSectionsProps {
  onNavigate: () => void;
}

export function useMenuSections({
  onNavigate,
}: UseMenuSectionsProps): MenuSection[] {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLanguage, languages } = useLanguage();
  const { userRole } = useUserRole();
  const { theme = 'light', setTheme } = useTheme();
  const { isEnabled: autoContextEnabled, toggleEnabled: toggleAutoContext } =
    useAutoContext();
  const {
    isBackgroundEnabled,
    enableRecordingBackground,
    disableRecordingBackground,
  } = useBackgroundRecordingIntegration();

  // Get weather logging state
  const { isEnabled: weatherLoggingEnabled, setEnabled: setWeatherLoggingEnabled } = useWeatherLogging();
  
  // Get location enrichment settings
  const { isEnabled: locationEnrichmentEnabled, toggleEnabled: toggleLocationEnrichment } = useLocationEnrichmentSettings();
  
  // Get subscription features
  const { features } = useSubscription();

  // Get PMScan and GPS status
  const {
    isConnected: isPMScanConnected,
    requestDevice,
    disconnect,
    locationEnabled,
    requestLocationPermission,
  } = useUnifiedData();

  const handleProfileClick = () => {
    navigate('/profile');
    onNavigate();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    onNavigate();
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
    const lang = languages.find((l) => l.code === currentLanguage);
    return lang ? lang.name : currentLanguage.toUpperCase();
  };

  const handleBackgroundRecordingToggle = async (enabled: boolean) => {
    if (enabled) {
      await enableRecordingBackground('30s'); // Default 30 second frequency
    } else {
      await disableRecordingBackground();
    }
  };

  return [
    {
      title: t('account.title'),
      items: [
        {
          icon: User,
          label: t('account.profile'),
          badge: null,
          action: handleProfileClick,
        },
        {
          icon: LogOut,
          label: t('account.logout'),
          badge: null,
          action: handleSignOut,
        },
      ],
    },
    {
      title: t('settingsMenu.title'),
      items: [
        {
          icon: Languages,
          label: t('settingsMenu.language'),
          badge: getCurrentLanguageDisplay(),
        },
        {
          icon: SunMoon,
          label: t('settingsMenu.darkMode'),
          badge: null,
          toggle: {
            checked: theme === 'dark',
            onCheckedChange: (checked: boolean) =>
              setTheme(checked ? 'dark' : 'light'),
          },
        },
        {
          icon: Moon,
          label: 'Background Recording',
          badge: null,
          toggle: {
            checked: isBackgroundEnabled,
            onCheckedChange: handleBackgroundRecordingToggle,
          },
          info: 'Continue recording PMScan data even when the app is minimized or in the background. Note: This will use more battery.',
        },
        {
          icon: Settings,
          label: t('settingsMenu.customThresholds'),
          isPremiumFeature: !features.hasCustomLists,
          action: handleCustomThresholds,
          info: !features.hasCustomLists ? 'Premium feature' : undefined,
        },
        {
          icon: AlertTriangle,
          label: t('settingsMenu.alertsAlarms'),
          isPremiumFeature: !features.hasCustomLists,
          action: handleCustomAlerts,
          info: !features.hasCustomLists ? 'Premium feature' : undefined,
        },
        {
          icon: Brain,
          label: 'Auto Context',
          isPremiumFeature: !features.canUseAutoContext,
          toggle: features.canUseAutoContext ? {
            checked: autoContextEnabled,
            onCheckedChange: toggleAutoContext,
          } : undefined,
          info: !features.canUseAutoContext ? 'Premium feature' : undefined,
        },
      ],
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
        {
          icon: Bluetooth,
          label: t('sensors.pmscan'),
          badge: isPMScanConnected ? t('sensors.connected') : null,
          action: () => {
            if (isPMScanConnected) {
              disconnect();
            } else {
              requestDevice();
            }
          },
        },
        {
          icon: MapPin,
          label: 'GPS',
          badge: locationEnabled ? t('sensors.connected') : null,
          action: () => {
            if (!locationEnabled) {
              requestLocationPermission();
            }
           },
         },
          {
            icon: Cloud,
            label: t('sensors.weather'),
            isPremiumFeature: !features.canUseWeatherData,
            toggle: features.canUseWeatherData ? {
              checked: weatherLoggingEnabled,
              onCheckedChange: setWeatherLoggingEnabled,
            } : undefined,
            info: !features.canUseWeatherData ? 'Premium feature' : undefined,
          },
          {
            icon: MapPinIcon,
            label: 'Location Enrichment',
            isPremiumFeature: !features.canUseLocationEnrichment,
            toggle: features.canUseLocationEnrichment ? {
              checked: locationEnrichmentEnabled,
              onCheckedChange: toggleLocationEnrichment,
            } : undefined,
            info: !features.canUseLocationEnrichment ? 'Premium feature' : 'Enhance location context using OpenStreetMap reverse geocoding to automatically detect places like restaurants, schools, etc.',
          },
       ],
     },
   ];
}
