import { MissionData } from './dataStorage';
import { storeCSVForSync } from '@/hooks/useCrashRecovery';
import { EventData } from '@/hooks/useEvents';
import { migrateMeasurementsContext } from '@/utils/contextMigration';
import * as logger from '@/utils/logger';
import { toISOString } from '@/utils/timeFormat';

export async function exportMissionToCSV(mission: MissionData): Promise<void> {
  logger.debug('📊 === CSV EXPORT STARTED ===');
  logger.debug('📊 Mission data:', {
    id: mission.id,
    name: mission.name,
    measurementsCount: mission.measurements?.length || 0,
    startTime: mission.startTime,
    endTime: mission.endTime
  });
  // Get events for this mission from localStorage
  const getEventsForMission = (missionId: string): EventData[] => {
    try {
      const localEvents = JSON.parse(localStorage.getItem(`mission_events_${missionId}`) || '[]');
      return localEvents.sort((a: EventData, b: EventData) => 
        new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
      );
    } catch (error) {
      logger.debug('Error fetching local events for export:', error);
      return [];
    }
  };

  const events = getEventsForMission(mission.id);
  
  // Migrate context from IDs to names before export
  const migratedMeasurements = migrateMeasurementsContext(mission.measurements);
  
  const headers = [
    'Timestamp',
    'PM1 (µg/m³)',
    'PM2.5 (µg/m³)',
    'PM10 (µg/m³)',
    'Temperature (°C)',
    'Humidity (%)',
    'Latitude',
    'Longitude',
    'GPS Accuracy (m)',
    'Location Context',
    'Activity Context',
    'Auto Context',
    'Enriched Location (Nominatim)',
    'Geohash',
    'Event Type',
    'Event Comment',
  ];

  // Create a map of which measurement each event should be assigned to
  const eventAssignments = new Map<string, EventData>();
  
  events.forEach(event => {
    const eventTime = new Date(event.timestamp || 0);
    let closestMeasurement = null;
    let closestTimeDiff = Infinity;
    
    migratedMeasurements.forEach((measurement, index) => {
      const measurementTime = measurement.timestamp instanceof Date ? measurement.timestamp : new Date(measurement.timestamp);
      const timeDiff = Math.abs(eventTime.getTime() - measurementTime.getTime());
      
      if (timeDiff < closestTimeDiff && timeDiff <= 30000) { // Within 30 seconds
        closestTimeDiff = timeDiff;
        closestMeasurement = index;
      }
    });
    
    if (closestMeasurement !== null) {
      eventAssignments.set(closestMeasurement.toString(), event);
    }
  });

  const rows = migratedMeasurements.map((m, index) => {
    const measurementTime = m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp);
    
    // Get the event assigned to this specific measurement
    const assignedEvent = eventAssignments.get(index.toString());

    return [
      toISOString(measurementTime),
      m.pm1.toFixed(1),
      m.pm25.toFixed(1),
      m.pm10.toFixed(1),
      m.temperature?.toFixed(1) || '',
      m.humidity?.toFixed(1) || '',
      m.latitude?.toFixed(6) || '',
      m.longitude?.toFixed(6) || '',
      m.accuracy?.toFixed(0) || '',
      m.locationContext || '',
      m.activityContext || '',
      m.automaticContext || '',
      m.enrichedLocation || '',
      m.geohash || '',
      assignedEvent?.event_type || '',
      assignedEvent?.comment || '',
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((field) => `"${field}"`).join(','))
    .join('\n');

  // Add UTF-8 BOM for proper encoding in Excel and other applications
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;

  // Create and download CSV file with proper UTF-8 encoding
  const blob = new Blob([csvWithBOM], {
    type: 'text/csv;charset=utf-8',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  // Create filename using new naming convention: [DeviceID]_[YYYYMMDD]_[HHMMSS].csv
  const startTime = mission.startTime;
  const deviceId = mission.deviceName || 'PMScan'; // Use stored device name or fallback to 'PMScan'
  const dateStr =
    startTime.getFullYear().toString() +
    (startTime.getMonth() + 1).toString().padStart(2, '0') +
    startTime.getDate().toString().padStart(2, '0');
  const timeStr =
    startTime.getHours().toString().padStart(2, '0') +
    startTime.getMinutes().toString().padStart(2, '0') +
    startTime.getSeconds().toString().padStart(2, '0');

  const filename = `${deviceId}_${dateStr}_${timeStr}.csv`;

  // Store CSV content for sync in case of network issues
  storeCSVForSync(filename, csvWithBOM);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  logger.debug('✅ CSV export completed successfully:', {
    filename,
    rowCount: rows.length,
    csvSize: csvWithBOM.length
  });
}
