import React from 'react';
import { MapboxMapCore } from './MapboxMapCore';

// Export memoized version to prevent unnecessary re-renders
export const MapboxMap = React.memo(MapboxMapCore);
