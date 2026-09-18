import { describe, expect, it, vi } from 'vitest';

import {
  MockAccelerometerSensor,
  UnsupportedAccelerometerSensor,
} from '../../src/infrastructure/sensors';

vi.mock('expo-sensors', () => ({
  Accelerometer: {
    isAvailableAsync: vi.fn(),
    getPermissionsAsync: vi.fn(),
    requestPermissionsAsync: vi.fn(),
    setUpdateInterval: vi.fn(),
    addListener: vi.fn(),
  },
}));

describe('accelerometer sensor adapters', () => {
  it('mock adapter exposes deterministic samples and removes every subscription', async () => {
    const sensor = new MockAccelerometerSensor();
    const samples: number[] = [];
    sensor.setUpdateInterval(50);
    const subscription = sensor.start(
      (sample) => samples.push(sample.x),
      () => undefined,
    );

    sensor.emit({ x: 1, y: 2, z: 3, timestampMs: 10 });
    subscription.remove();
    sensor.emit({ x: 4, y: 5, z: 6, timestampMs: 20 });

    expect(await sensor.isAvailable()).toBe(true);
    expect(sensor.lastIntervalMs).toBe(50);
    expect(samples).toEqual([1]);
    expect(sensor.getSubscriptionCount()).toBe(0);
  });

  it('unsupported adapter is a silent button-fallback implementation', async () => {
    const sensor = new UnsupportedAccelerometerSensor();
    expect(await sensor.isAvailable()).toBe(false);
    expect(await sensor.getAccessStatus()).toBe('unavailable');
    expect(sensor.getSubscriptionCount()).toBe(0);
  });
});
