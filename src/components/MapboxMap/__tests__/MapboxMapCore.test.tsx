import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MapboxMapCore from '../MapboxMapCore';

// Mock the initializer so we don't hit Mapbox/network
vi.mock('@/lib/mapbox/mapInitializer', () => {
  return {
    initializeMap: vi.fn().mockResolvedValue({
      on: vi.fn(),
      off: vi.fn(),
      addControl: vi.fn(),
      remove: vi.fn(),
    }),
  };
});

describe('MapboxMapCore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls initializeMap after clicking Load Map', async () => {
    const { initializeMap } = await import('@/lib/mapbox/mapInitializer');

    render(
      <MapboxMapCore
        currentLocation={{ latitude: 48.8566, longitude: 2.3522 }}
        thresholds={{}}
        onMapError={vi.fn()}
      />
    );

    // Trigger lazy init
    fireEvent.click(screen.getByRole('button', { name: /load map/i }));

    await waitFor(() => {
      expect(initializeMap).toHaveBeenCalled();
    });
  });
});
