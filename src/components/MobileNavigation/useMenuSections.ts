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
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleFit } from '@/hooks/useGoogleFit';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserRole } from '@/hooks/useUserRole';
import { useAutoContext } from '@/hooks/useAutoContext';
import { useBackgroundRecordingIntegration } from '@/hooks/useBackgroundRecordingIntegration';
import { usePMScanBluetooth } from '@/hooks/usePMScanBluetooth';
import { useGPS } from '@/hooks/useGPS';
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

  // Get PMScan and GPS status
  const {
    isConnected: isPMScanConnected,
    requestDevice,
    disconnect,
  } = usePMScanBluetooth();
  const { locationEnabled, requestLocationPermission } = useGPS();

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
          icon: Settings,
          label: t('settingsMenu.customThresholds'),
          badge: null,
          action: handleCustomThresholds,
        },
        {
          icon: AlertTriangle,
          label: t('settingsMenu.alertsAlarms'),
          badge: null,
          action: handleCustomAlerts,
        },
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
          icon: Brain,
          label: 'Auto Context',
          badge: null,
          toggle: {
            checked: autoContextEnabled,
            onCheckedChange: toggleAutoContext,
          },
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
      ],
    },
  ];
}
