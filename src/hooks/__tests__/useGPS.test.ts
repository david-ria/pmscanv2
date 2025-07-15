import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGPS } from '../useGPS';

const createNavigatorMocks = () => {
  const geolocation = {
    watchPosition: vi.fn().mockReturnValue(1),
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn(),
  };

  const permissions = {
    query: vi.fn().mockResolvedValue({
      state: 'granted',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  };

  Object.defineProperty(global, 'navigator', {
    value: { geolocation, permissions },
    configurable: true,
  });

  return { geolocation, permissions };
};

describe('useGPS', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not enable location when disabled', () => {
    const { result } = renderHook(() => useGPS(false));
    expect(result.current.locationEnabled).toBe(false);
  });

  it('requests permission and starts watching when enabled', async () => {
    vi.useFakeTimers();
    const { geolocation } = createNavigatorMocks();

    const { result } = renderHook(() => useGPS(true));

    await act(async () => {
      await result.current.requestLocationPermission();
    });

    await act(async () => {
      vi.runAllTimers();
    });

    // Run timers again to ensure no additional watchers are created
    await act(async () => {
      vi.runAllTimers();
    });

    vi.useRealTimers();

    expect(result.current.locationEnabled).toBe(true);
    await waitFor(() =>
      expect(geolocation.watchPosition).toHaveBeenCalledTimes(1)
    );
  });
});
