import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Map, Users, MapPin, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { decodeGeohash } from '@/utils/geohash';

interface GeohashCell {
  geohash_cell: string;
  avg_pm25: number;
  avg_pm10: number;
  avg_pm1: number;
  measurement_count: number;
  contributor_count: number;
}

interface CollaborativeMapProps {
  selectedDate: Date;
  selectedPeriod: 'day' | 'week' | 'month' | 'year';
}

export function CollaborativeMap({ selectedDate, selectedPeriod }: CollaborativeMapProps) {
  const { t } = useTranslation();
  const { activeGroup } = useGroupSettings();
  
  const [pmType, setPmType] = useState<'pm1' | 'pm25' | 'pm10'>('pm25');
  const [precision, setPrecision] = useState(6);
  const [loading, setLoading] = useState(true);
  const [geohashData, setGeohashData] = useState<GeohashCell[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const mapboxgl = useRef<any>(null);

  // Calculate date range based on period
  const { startDate, endDate } = useMemo(() => {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);
    
    switch (selectedPeriod) {
      case 'week':
        start.setDate(start.getDate() - start.getDay());
        end.setDate(start.getDate() + 6);
        break;
      case 'month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        break;
      case 'year':
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
      default:
        // day - no change needed
        break;
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }, [selectedDate, selectedPeriod]);

  // Fetch geohash data
  useEffect(() => {
    if (!activeGroup?.id) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('get_group_geohash_aggregates', {
          p_group_id: activeGroup.id,
          p_start_date: startDate,
          p_end_date: endDate,
          p_geohash_precision: precision
        });

        if (rpcError) throw rpcError;
        setGeohashData(data || []);
      } catch (err) {
        console.error('Error fetching geohash data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeGroup?.id, startDate, endDate, precision]);

  // Convert geohash cells to GeoJSON
  const geojsonData = useMemo(() => {
    const features = geohashData.map(cell => {
      const bounds = decodeGeohash(cell.geohash_cell);
      const pmValue = pmType === 'pm1' ? cell.avg_pm1 : 
                      pmType === 'pm25' ? cell.avg_pm25 : 
                      cell.avg_pm10;

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [bounds.minLng, bounds.minLat],
            [bounds.maxLng, bounds.minLat],
            [bounds.maxLng, bounds.maxLat],
            [bounds.minLng, bounds.maxLat],
            [bounds.minLng, bounds.minLat]
          ]]
        },
        properties: {
          pm: pmValue,
          count: cell.measurement_count,
          contributors: cell.contributor_count
        }
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features
    };
  }, [geohashData, pmType]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || loading || geohashData.length === 0) return;

    const initMap = async () => {
      const mapboxglModule = await import('mapbox-gl');
      mapboxgl.current = mapboxglModule.default;
      const token = await supabase.functions.invoke('get-mapbox-token');
      
      if (!token.data?.token) {
        setError('Failed to load map token');
        return;
      }

      mapboxgl.current.accessToken = token.data.token;
      
      const mapInstance = new mapboxgl.current.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [0, 20],
        zoom: 2
      });

      mapInstance.on('load', () => {
        // Add source
        mapInstance.addSource('geohash-data', {
          type: 'geojson',
          data: geojsonData as any
        });

        // Add fill layer
        mapInstance.addLayer({
          id: 'geohash-fill',
          type: 'fill',
          source: 'geohash-data',
          paint: {
            'fill-color': [
              'interpolate',
              ['linear'],
              ['get', 'pm'],
              0, '#22c55e',
              10, '#84cc16',
              15, '#fbbf24',
              25, '#f97316',
              50, '#ef4444',
              100, '#991b1b'
            ],
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'count'],
              3, 0.3,
              10, 0.5,
              50, 0.7,
              100, 0.9
            ]
          }
        });

        // Add border layer
        mapInstance.addLayer({
          id: 'geohash-outline',
          type: 'line',
          source: 'geohash-data',
          paint: {
            'line-color': '#d1d5db',
            'line-width': 1,
            'line-opacity': 0.5
          }
        });

        setMapLoaded(true);
      });

      map.current = mapInstance;
    };

    initMap().catch(err => {
      console.error('Map init error:', err);
      setError('Failed to initialize map');
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [geohashData, loading]);

  // Update map data and auto-zoom when geojson, pmType, or precision changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('geohash-data');
    if (source) {
      source.setData(geojsonData);
      
      // Auto-zoom to fit data bounds whenever data changes
      if (geojsonData.features.length > 0 && mapboxgl.current) {
        const bounds = new mapboxgl.current.LngLatBounds();
        
        geojsonData.features.forEach(feature => {
          if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach((coord: [number, number]) => {
              bounds.extend(coord);
            });
          }
        });
        
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15,
          duration: 1000
        });
      }
    }
  }, [geojsonData, mapLoaded, pmType, precision]);

  const precisionLabels = {
    5: t('analysis.collaborativeMap.precisionLow'),
    6: t('analysis.collaborativeMap.precisionMedium'),
    7: t('analysis.collaborativeMap.precisionHigh')
  };

  if (!activeGroup) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          {t('analysis.collaborativeMap.title')}
        </CardTitle>
        <CardDescription>
          {t('analysis.collaborativeMap.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pm-type-select">{t('analysis.pollutionBreakdown.pmType')}</Label>
            <Select value={pmType} onValueChange={(v) => setPmType(v as typeof pmType)}>
              <SelectTrigger id="pm-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pm1">PM1.0</SelectItem>
                <SelectItem value="pm25">PM2.5</SelectItem>
                <SelectItem value="pm10">PM10</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="precision-slider">
              {t('analysis.collaborativeMap.precision')}: {precisionLabels[precision as keyof typeof precisionLabels]}
            </Label>
            <Slider
              id="precision-slider"
              value={[precision]}
              onValueChange={([v]) => setPrecision(v)}
              min={5}
              max={7}
              step={1}
              className="mt-2"
            />
          </div>
        </div>

        {/* Map */}
        <div className="h-[50vh] sm:h-[60vh] lg:h-[800px] w-full rounded-lg overflow-hidden border border-border">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">{t('analysis.collaborativeMap.loading')}</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : geohashData.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <p className="text-sm text-muted-foreground">{t('analysis.collaborativeMap.noData')}</p>
            </div>
          ) : (
            <div ref={mapContainer} className="h-full w-full" />
          )}
        </div>

        {/* Legend */}
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-xs font-medium mb-2">{t('analysis.collaborativeMap.legend')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }}></div>
              <span>0-10</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(84, 81%, 44%)' }}></div>
              <span>10-15</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(43, 96%, 56%)' }}></div>
              <span>15-25</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(25, 95%, 53%)' }}></div>
              <span>25-50</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(0, 84%, 60%)' }}></div>
              <span>50-100</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(0, 70%, 35%)' }}></div>
              <span>100+</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('analysis.collaborativeMap.totalCells')}</p>
            </div>
            <p className="text-2xl font-bold">{geohashData.length}</p>
          </div>
          
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('analysis.collaborativeMap.groupMembers')}</p>
            </div>
            <p className="text-2xl font-bold">
              {Math.max(...geohashData.map(c => c.contributor_count), 0)}
            </p>
          </div>

          <div className="bg-muted p-3 rounded-lg col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('analysis.collaborativeMap.measurementCount')}</p>
            </div>
            <p className="text-2xl font-bold">
              {geohashData.reduce((sum, c) => sum + c.measurement_count, 0)}
            </p>
          </div>
        </div>

        {/* Privacy Note */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {t('analysis.collaborativeMap.privacyNote')}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
