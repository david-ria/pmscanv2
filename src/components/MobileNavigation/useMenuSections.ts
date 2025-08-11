import {
  User,
  Settings,
  AlertTriangle,
  LogOut,
  Languages,
  Moon,
  MapPin,
  Bluetooth,
  Cloud,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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

  const handleSettings = () => {
    navigate('/my-settings');
    onNavigate();
  };

  return [
    {
      title: "Compte",
      items: [
        {
          icon: User,
          label: "Mon profil",
          badge: null,
          action: handleProfileClick,
        },
        {
          icon: LogOut,
          label: "Déconnexion",
          badge: null,
          action: handleSignOut,
        },
      ],
    },
    {
      title: "Paramètres",
      items: [
        {
          icon: Settings,
          label: "Mes Paramètres",
          badge: null,
          action: handleSettings,
        },
        {
          icon: Settings,
          label: "Seuils personnalisés",
          badge: null,
          action: handleCustomThresholds,
        },
        {
          icon: AlertTriangle,
          label: "Alertes & alarmes",
          badge: null,
          action: handleCustomAlerts,
        },
        {
          icon: Languages,
          label: "Langue",
          badge: "FR",
        },
        {
          icon: Moon,
          label: "Mode sombre",
          badge: null,
          toggle: {
            checked: false,
            onCheckedChange: () => {},
          },
        },
      ],
    },
    {
      title: "Capteurs",
      items: [
        {
          icon: Bluetooth,
          label: "Capteur PMSCAN",
          badge: null,
          action: () => {
            navigate('/');
            onNavigate();
          },
        },
        {
          icon: MapPin,
          label: "GPS",
          badge: null,
          action: () => {},
        },
        {
          icon: Cloud,
          label: "Données Météo",
          badge: null,
          action: () => {},
        },
      ],
    },
  ];
}