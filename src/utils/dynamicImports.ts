// Dynamic import utilities for better code splitting and tree shaking

/**
 * Lazy load heavy analysis components only when needed
 */
export const loadAnalysisComponents = () => ({
  StatisticalAnalysis: () => import('@/components/Analysis/StatisticalAnalysis'),
  GroupComparison: () => import('@/components/Analysis/GroupComparison'),
  WHOComplianceProgress: () => import('@/components/Analysis/WHOComplianceProgress'),
  PollutionBreakdown: () => import('@/components/Analysis/PollutionBreakdown'),
  ExportReportDialog: () => import('@/components/Analysis/ExportReportDialog'),
});

/**
 * Lazy load Mapbox components only when map is needed
 */
export const loadMapboxComponents = () => ({
  MapboxMap: () => import('@/components/MapboxMap'),
  MapboxMapCore: () => import('@/components/MapboxMap/MapboxMapCore'),
  MapboxMapControls: () => import('@/components/MapboxMap/MapboxMapControls'),
});

/**
 * Lazy load Bluetooth/PMScan components only when sensor connection is needed
 */
export const loadBluetoothComponents = () => ({
  BluetoothConnection: () => import('@/components/BluetoothConnection'),
  PMScanConnectionStatus: () => import('@/components/PMScanConnectionStatus'),
  ConnectionDialog: () => import('@/components/ConnectionDialog'),
});

/**
 * Lazy load group management components only when groups page is accessed
 */
export const loadGroupComponents = () => ({
  CreateGroupDialog: () => import('@/components/Groups/CreateGroupDialog'),
  EditGroupDialog: () => import('@/components/Groups/EditGroupDialog'),
  InviteUserDialog: () => import('@/components/Groups/InviteUserDialog'),
  GroupSettingsDialog: () => import('@/components/Groups/GroupSettingsDialog'),
  GroupThresholdDialog: () => import('@/components/Groups/GroupThresholdDialog'),
  GroupCustomThresholdsDialog: () => import('@/components/Groups/GroupCustomThresholdsDialog'),
});

/**
 * Lazy load admin components only for admin users
 */
export const loadAdminComponents = () => ({
  RoleManagement: () => import('@/components/Admin/RoleManagement'),
});

/**
 * Lazy load PDF export functionality only when needed
 */
export const loadPDFExport = () => import('@/lib/pdfExport');

/**
 * Lazy load CSV export functionality only when needed
 */
export const loadCSVExport = () => import('@/lib/csvExport');

/**
 * Lazy load TensorFlow components only when ML features are needed
 */
export const loadTensorFlowComponents = () => import('@tensorflow/tfjs');

/**
 * Preload critical chunks based on user interaction
 */
export const preloadCriticalChunks = () => {
  // Preload router chunk since navigation is likely
  import('react-router-dom');
  
  // Preload UI core since it's used everywhere
  import('@radix-ui/react-dialog');
  import('@radix-ui/react-select');
  import('@radix-ui/react-tabs');
};

/**
 * Preload chunks based on current route
 */
export const preloadRouteChunks = (route: string) => {
  switch (route) {
    case '/analysis':
      // Preload analysis-specific chunks
      loadAnalysisComponents();
      import('recharts');
      break;
    case '/history':
      // Preload history-specific chunks
      loadMapboxComponents();
      import('date-fns');
      break;
    case '/groups':
      // Preload group management chunks
      loadGroupComponents();
      break;
    default:
      // For real-time page, preload sensor-related chunks
      loadBluetoothComponents();
      break;
  }
};