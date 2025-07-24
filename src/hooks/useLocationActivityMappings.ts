import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LocationActivityMapping {
  id: string;
  location_key: string;
  activity_key: string;
  location_label: string;
  activity_label: string;
}

export interface LocationOption {
  key: string;
  label: string;
}

export interface ActivityOption {
  key: string;
  label: string;
}

export function useLocationActivityMappings() {
  const [mappings, setMappings] = useState<LocationActivityMapping[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('location_activity_mappings')
        .select('*')
        .order('location_label', { ascending: true });

      if (error) throw error;

      setMappings(data || []);

      // Extract unique locations
      const uniqueLocations = Array.from(
        new Map(
          data?.map(item => [item.location_key, { key: item.location_key, label: item.location_label }]) || []
        ).values()
      );
      setLocations(uniqueLocations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mappings');
    } finally {
      setLoading(false);
    }
  };

  const getActivitiesForLocation = (locationKey: string): ActivityOption[] => {
    return mappings
      .filter(mapping => mapping.location_key === locationKey)
      .map(mapping => ({
        key: mapping.activity_key,
        label: mapping.activity_label,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  return {
    mappings,
    locations,
    loading,
    error,
    getActivitiesForLocation,
    refetch: fetchMappings,
  };
}