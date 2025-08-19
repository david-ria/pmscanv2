import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';

interface LocationEnrichmentSettings {
  enabled: boolean;
}

const STORAGE_KEY = 'locationEnrichmentSettings';

export function useLocationEnrichmentSettings() {
  const { features } = useSubscription();
  const [settings, setSettings] = useState<LocationEnrichmentSettings>({
    enabled: true // Enable by default
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
      } catch (error) {
        console.error('Failed to parse location enrichment settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const toggleEnabled = (enabled: boolean) => {
    // Only allow enabling if user has premium access
    if (enabled && !features.canUseLocationEnrichment) {
      return;
    }
    setSettings(prev => ({ ...prev, enabled }));
  };

  return {
    isEnabled: settings.enabled && features.canUseLocationEnrichment,
    toggleEnabled
  };
}