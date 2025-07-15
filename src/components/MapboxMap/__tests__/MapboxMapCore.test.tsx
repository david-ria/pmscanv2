import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThresholdProvider } from '@/contexts/ThresholdContext';

vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}));
vi.mock('mapbox-gl', () => ({ default: {} }));

vi.mock('@/lib/mapbox/mapInitializer', () => ({
  initializeMap: vi.fn(),
}));

import { initializeMap } from '@/lib/mapbox/mapInitializer';
const mockInitializeMap = vi.mocked(initializeMap);
import { MapboxMapCore } from '../MapboxMapCore';

describe('MapboxMapCore', () => {
  it('shows error when initialization fails', async () => {
    mockInitializeMap.mockImplementation(
      async (container, loc, thr, onLoad, onError) => {
        onError('Map failed to load');
        return null;
      }
    );

    render(
      <ThresholdProvider>
        <MapboxMapCore />
      </ThresholdProvider>
    );

    expect(await screen.findByText('Map failed to load')).toBeInTheDocument();
    expect(screen.getByText('Map Unavailable')).toBeInTheDocument();
  });

  it('calls initializeMap on mount', async () => {
    mockInitializeMap.mockImplementation(
      async (container, loc, thr, onLoad) => {
        onLoad();
        return { remove: vi.fn() } as any;
      }
    );

    render(
      <ThresholdProvider>
        <MapboxMapCore />
      </ThresholdProvider>
    );

    await waitFor(() => expect(mockInitializeMap).toHaveBeenCalled());
  });
});
