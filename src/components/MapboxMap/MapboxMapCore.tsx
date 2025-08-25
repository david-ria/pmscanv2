import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MapboxMapCore from '../MapboxMapCore';

// Mock the initializer so no real map/network happens
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

    // Wait for the lazy-init button and click it
    const btn = await screen.findByRole('button', { name: /load map/i });
    fireEvent.click(btn);

    // Wait for effect to run and call the initializer
    await waitFor(
      () => expect(initializeMap).toHaveBeenCalledTimes(1),
      { timeout: 3000 }
    );
  });
});
