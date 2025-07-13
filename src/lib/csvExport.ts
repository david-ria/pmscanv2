import { MissionData } from "./dataStorage";

export function exportMissionToCSV(mission: MissionData): void {
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
    'Auto Context'
  ];

  const rows = mission.measurements.map(m => [
    m.timestamp.toISOString(),
    m.pm1.toFixed(1),
    m.pm25.toFixed(1),
    m.pm10.toFixed(1),
    m.temperature?.toFixed(1) || '',
    m.humidity?.toFixed(1) || '',
    m.latitude?.toFixed(6) || '',
    m.longitude?.toFixed(6) || '',
    m.accuracy?.toFixed(0) || '',
    m.locationContext || mission.locationContext || '',
    m.activityContext || mission.activityContext || '',
    m.automaticContext || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  // Add UTF-8 BOM for proper encoding in Excel and other applications
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;

  // Create and download CSV file with proper UTF-8 encoding
  const blob = new Blob([csvWithBOM], { 
    type: 'text/csv;charset=utf-8' 
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Create filename using new naming convention: [DeviceID]_[YYYYMMDD]_[HHMMSS].csv
  const startTime = mission.startTime;
  const deviceId = "PMScan"; // Default device ID - could be enhanced to use actual device name
  const dateStr = startTime.getFullYear().toString() + 
                  (startTime.getMonth() + 1).toString().padStart(2, '0') + 
                  startTime.getDate().toString().padStart(2, '0');
  const timeStr = startTime.getHours().toString().padStart(2, '0') + 
                  startTime.getMinutes().toString().padStart(2, '0') + 
                  startTime.getSeconds().toString().padStart(2, '0');
  
  const filename = `${deviceId}_${dateStr}_${timeStr}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log(`Mission exported to CSV: ${filename}`);
}
