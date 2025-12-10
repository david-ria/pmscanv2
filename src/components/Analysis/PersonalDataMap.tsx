import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Map, Satellite, Building2, MapPin, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { dataStorage } from '@/lib/dataStorage';
import type { PollutantType } from './PollutantSelector';

interface Measurement {
  latitude?: number | null;
  longitude?: number | null;
  pm1: number;
  pm25: number;
  pm10: number;
  tvoc?: number | null;
  timestamp: string | Date;
}

interface PersonalDataMapProps {
  selectedDate: Date;
  selectedPeriod: 'day' | 'week' | 'month' | 'year';
  pollutantType: PollutantType;
  filteredMissions: any[];
}

// Color scales for different pollutants
const getPMColor = (value: number): string => {
  if (value <= 10) return '#22c55e';
  if (value <= 15) return '#84cc16';
  if (value <= 25) return '#fbbf24';
  if (value <= 50) return '#f97316';
  if (value <= 100) return '#ef4444';
  return '#991b1b';
};

const getTVOCColor = (value: number): string => {
  if (value <= 100) return '#22c55e';
  if (value <= 250) return '#84cc16';
  if (value <= 500) return '#fbbf24';
  if (value <= 1000) return '#f97316';
  if (value <= 2000) return '#ef4444';
  return '#991b1b';
};

const getColor = (value: number, type: PollutantType): string => {
  return type === 'tvoc' ? getTVOCColor(value) : getPMColor(value);
};

export function PersonalDataMap({ 
  selectedDate, 
  selectedPeriod, 
  pollutantType,
  filteredMissions 
}: PersonalDataMapProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [showBuildings, setShowBuildings] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const mapboxgl = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Fetch measurements for filtered missions
  useEffect(() => {
    const fetchMeasurements = async () => {
      setLoading(true);
      setError(null);

      try {
        const missionIds = filteredMissions.map(m => m.id);
        if (missionIds.length === 0) {
          setMeasurements([]);
          setLoading(false);
          return;
        }

        const allMeasurements: Measurement[] = [];
        
        for (const missionId of missionIds) {
          const missionMeasurements = await dataStorage.getMissionMeasurements(missionId);
          if (missionMeasurements) {
            allMeasurements.push(...missionMeasurements.filter(m => 
              m.latitude != null && m.longitude != null
            ));
          }
        }

        setMeasurements(allMeasurements);
      } catch (err) {
        console.error('Error fetching measurements:', err);
        setError(err instanceof Error ? err.message : 'Failed to load measurements');
      } finally {
        setLoading(false);
      }
    };

    fetchMeasurements();
  }, [filteredMissions]);

  // Convert measurements to GeoJSON
  const geojsonData = useMemo(() => {
    const features = measurements
      .filter(m => m.latitude != null && m.longitude != null)
      .map(m => {
        const value = pollutantType === 'pm1' ? m.pm1 :
                      pollutantType === 'pm25' ? m.pm25 :
                      pollutantType === 'pm10' ? m.pm10 :
                      m.tvoc ?? 0;

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [m.longitude!, m.latitude!]
          },
          properties: {
            value,
            pm1: m.pm1,
            pm25: m.pm25,
            pm10: m.pm10,
            tvoc: m.tvoc ?? null,
            timestamp: m.timestamp,
            color: getColor(value, pollutantType)
          }
        };
      });

    return {
      type: 'FeatureCollection' as const,
      features
    };
  }, [measurements, pollutantType]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || loading || measurements.length === 0) return;

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
        style: isSatellite 
          ? 'mapbox://styles/mapbox/satellite-streets-v12' 
          : 'mapbox://styles/mapbox/light-v11',
        center: [0, 20],
        zoom: 2,
        pitch: 45,
        bearing: -17.6,
        antialias: true
      });

      mapInstance.on('load', () => {
        // Add source
        mapInstance.addSource('personal-data', {
          type: 'geojson',
          data: geojsonData as any
        });

        // Add circle layer
        mapInstance.addLayer({
          id: 'personal-points',
          type: 'circle',
          source: 'personal-data',
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8, 4,
              12, 8,
              16, 12
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.8
          }
        });

        // Add 3D buildings layer if enabled
        if (showBuildings) {
          const layers = mapInstance.getStyle().layers;
          const labelLayerId = layers?.find(
            (layer: any) => layer.type === 'symbol' && layer.layout?.['text-field']
          )?.id;

          mapInstance.addLayer({
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.6
            }
          }, labelLayerId);
        }

        // Create popup for tooltip
        const popup = new mapboxgl.current.Popup({
          closeButton: false,
          closeOnClick: false
        });

        // Show tooltip on hover
        mapInstance.on('mouseenter', 'personal-points', (e: any) => {
          mapInstance.getCanvas().style.cursor = 'pointer';
          
          if (e.features && e.features[0]) {
            const props = e.features[0].properties;
            const coordinates = e.features[0].geometry.coordinates.slice();
            
            const time = props.timestamp 
              ? new Date(props.timestamp).toLocaleString()
              : 'N/A';
            
            const html = `
              <div style="padding: 8px; font-family: system-ui, -apple-system, sans-serif; min-width: 180px;">
                <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; color: #111827;">${t('analysis.personalMap.tooltip.title')}</div>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 13px;">
                  <span style="color: #6b7280;">PM1:</span>
                  <span style="font-weight: 500; color: #111827;">${props.pm1?.toFixed(1)} µg/m³</span>
                  <span style="color: #6b7280;">PM2.5:</span>
                  <span style="font-weight: 500; color: #111827;">${props.pm25?.toFixed(1)} µg/m³</span>
                  <span style="color: #6b7280;">PM10:</span>
                  <span style="font-weight: 500; color: #111827;">${props.pm10?.toFixed(1)} µg/m³</span>
                  ${props.tvoc !== null ? `
                    <span style="color: #6b7280;">TVOC:</span>
                    <span style="font-weight: 500; color: #111827;">${props.tvoc} ppb</span>
                  ` : ''}
                </div>
                <div style="border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 8px; font-size: 12px; color: #6b7280;">
                  ${time}
                </div>
              </div>
            `;
            
            popup.setLngLat(coordinates).setHTML(html).addTo(mapInstance);
          }
        });

        // Hide tooltip
        mapInstance.on('mouseleave', 'personal-points', () => {
          mapInstance.getCanvas().style.cursor = '';
          popup.remove();
        });

        setMapLoaded(true);

        // Auto-zoom to fit data
        if (geojsonData.features.length > 0) {
          const bounds = new mapboxgl.current.LngLatBounds();
          geojsonData.features.forEach(feature => {
            bounds.extend(feature.geometry.coordinates as [number, number]);
          });
          mapInstance.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15,
            duration: 1000
          });
        }
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
  }, [measurements, loading]);

  // Update map data when pollutant type changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('personal-data');
    if (source) {
      source.setData(geojsonData);
      
      // Auto-zoom to fit data bounds
      if (geojsonData.features.length > 0 && mapboxgl.current) {
        const bounds = new mapboxgl.current.LngLatBounds();
        geojsonData.features.forEach(feature => {
          bounds.extend(feature.geometry.coordinates as [number, number]);
        });
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15,
          duration: 1000
        });
      }
    }
  }, [geojsonData, mapLoaded, pollutantType]);

  // Toggle satellite view
  const toggleSatellite = () => {
    if (!map.current || !mapboxgl.current) return;
    
    const newStyle = isSatellite 
      ? 'mapbox://styles/mapbox/light-v11'
      : 'mapbox://styles/mapbox/satellite-streets-v12';
    
    map.current.setStyle(newStyle);
    
    map.current.once('style.load', () => {
      map.current.addSource('personal-data', {
        type: 'geojson',
        data: geojsonData as any
      });
      
      map.current.addLayer({
        id: 'personal-points',
        type: 'circle',
        source: 'personal-data',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 4,
            12, 8,
            16, 12
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.8
        }
      });

      if (showBuildings) {
        const layers = map.current.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer: any) => layer.type === 'symbol' && layer.layout?.['text-field']
        )?.id;

        map.current.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.6
          }
        }, labelLayerId);
      }
      
      // Re-add tooltip listeners
      const popup = new mapboxgl.current.Popup({
        closeButton: false,
        closeOnClick: false
      });

      map.current.on('mouseenter', 'personal-points', (e: any) => {
        map.current.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          const coordinates = e.features[0].geometry.coordinates.slice();
          const time = props.timestamp ? new Date(props.timestamp).toLocaleString() : 'N/A';
          
          const html = `
            <div style="padding: 8px; font-family: system-ui, sans-serif; min-width: 180px;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">${t('analysis.personalMap.tooltip.title')}</div>
              <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 13px;">
                <span style="color: #6b7280;">PM1:</span>
                <span style="font-weight: 500;">${props.pm1?.toFixed(1)} µg/m³</span>
                <span style="color: #6b7280;">PM2.5:</span>
                <span style="font-weight: 500;">${props.pm25?.toFixed(1)} µg/m³</span>
                <span style="color: #6b7280;">PM10:</span>
                <span style="font-weight: 500;">${props.pm10?.toFixed(1)} µg/m³</span>
                ${props.tvoc !== null ? `
                  <span style="color: #6b7280;">TVOC:</span>
                  <span style="font-weight: 500;">${props.tvoc} ppb</span>
                ` : ''}
              </div>
              <div style="border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 8px; font-size: 12px; color: #6b7280;">
                ${time}
              </div>
            </div>
          `;
          popup.setLngLat(coordinates).setHTML(html).addTo(map.current);
        }
      });

      map.current.on('mouseleave', 'personal-points', () => {
        map.current.getCanvas().style.cursor = '';
        popup.remove();
      });
    });
    
    setIsSatellite(!isSatellite);
  };

  // Toggle 3D buildings
  const toggleBuildings = () => {
    if (!map.current) return;

    if (showBuildings) {
      if (map.current.getLayer('3d-buildings')) {
        map.current.removeLayer('3d-buildings');
      }
    } else {
      const layers = map.current.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer: any) => layer.type === 'symbol' && layer.layout?.['text-field']
      )?.id;

      map.current.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.6
        }
      }, labelLayerId);
    }

    setShowBuildings(!showBuildings);
  };

  // Legend based on pollutant type
  const renderLegend = () => {
    if (pollutantType === 'tvoc') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
            <span>0-100</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#84cc16' }}></div>
            <span>100-250</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
            <span>250-500</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
            <span>500-1k</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span>1k-2k</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#991b1b' }}></div>
            <span>2k+</span>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
          <span>0-10</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#84cc16' }}></div>
          <span>10-15</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
          <span>15-25</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
          <span>25-50</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
          <span>50-100</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#991b1b' }}></div>
          <span>100+</span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {t('analysis.personalMap.title')}
        </CardTitle>
        <CardDescription>
          {t('analysis.personalMap.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map */}
        <div className="h-[50vh] sm:h-[60vh] lg:h-[calc(100vh-16rem)] lg:max-h-[900px] w-full rounded-lg overflow-hidden border border-border">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">{t('analysis.personalMap.loading')}</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : measurements.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <p className="text-sm text-muted-foreground">{t('analysis.personalMap.noData')}</p>
            </div>
          ) : (
            <div className="h-full w-full relative">
              <div ref={mapContainer} className="h-full w-full" />
              
              {/* Map Toggle Buttons */}
              <div className="absolute top-3 left-3 z-10 flex gap-2">
                <Button
                  onClick={toggleSatellite}
                  size="sm"
                  variant="secondary"
                  className="bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background"
                >
                  {isSatellite ? (
                    <>
                      <Map className="h-4 w-4 mr-2" />
                      {t('analysis.collaborativeMap.mapView')}
                    </>
                  ) : (
                    <>
                      <Satellite className="h-4 w-4 mr-2" />
                      {t('analysis.collaborativeMap.satelliteView')}
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={toggleBuildings}
                  size="sm"
                  variant={showBuildings ? "default" : "secondary"}
                  className="bg-background/90 backdrop-blur-sm border border-border shadow-lg hover:bg-background"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  {t('analysis.collaborativeMap.buildings')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-xs font-medium mb-2">
            {pollutantType === 'tvoc' 
              ? t('analysis.personalMap.legendTvoc')
              : t('analysis.personalMap.legendPm')
            }
          </p>
          {renderLegend()}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('analysis.personalMap.totalPoints')}</p>
            </div>
            <p className="text-2xl font-bold">{measurements.length}</p>
          </div>
          
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('analysis.personalMap.missions')}</p>
            </div>
            <p className="text-2xl font-bold">{filteredMissions.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
