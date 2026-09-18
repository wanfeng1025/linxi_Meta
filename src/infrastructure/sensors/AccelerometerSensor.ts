import { Accelerometer } from 'expo-sensors';

import type { AccelerometerSample } from '@/domain/device';

export type SensorAccessStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export interface SensorSubscription {
  remove(): void;
}

export interface AccelerometerSensor {
  isAvailable(): Promise<boolean>;
  getAccessStatus(): Promise<SensorAccessStatus>;
  requestAccess(): Promise<SensorAccessStatus>;
  setUpdateInterval(intervalMs: number): void;
  start(
    onSample: (sample: AccelerometerSample) => void,
    onError: (error: Error) => void,
  ): SensorSubscription;
  getSubscriptionCount(): number;
}

function toAccessStatus(status: string): SensorAccessStatus {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export class ExpoAccelerometerSensor implements AccelerometerSensor {
  private subscriptions = 0;

  public async isAvailable(): Promise<boolean> {
    return Accelerometer.isAvailableAsync();
  }

  public async getAccessStatus(): Promise<SensorAccessStatus> {
    if (!(await this.isAvailable())) return 'unavailable';
    const response = await Accelerometer.getPermissionsAsync();
    return toAccessStatus(response.status);
  }

  public async requestAccess(): Promise<SensorAccessStatus> {
    if (!(await this.isAvailable())) return 'unavailable';
    const response = await Accelerometer.requestPermissionsAsync();
    return toAccessStatus(response.status);
  }

  public setUpdateInterval(intervalMs: number): void {
    Accelerometer.setUpdateInterval(intervalMs);
  }

  public start(
    onSample: (sample: AccelerometerSample) => void,
    onError: (error: Error) => void,
  ): SensorSubscription {
    try {
      const nativeSubscription = Accelerometer.addListener(({ x, y, z }) => {
        onSample({ x, y, z, timestampMs: Date.now() });
      });
      this.subscriptions += 1;
      let removed = false;
      return {
        remove: () => {
          if (removed) return;
          removed = true;
          nativeSubscription.remove();
          this.subscriptions = Math.max(0, this.subscriptions - 1);
        },
      };
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Accelerometer subscription failed.'));
      return { remove: () => undefined };
    }
  }

  public getSubscriptionCount(): number {
    return this.subscriptions;
  }
}

export class UnsupportedAccelerometerSensor implements AccelerometerSensor {
  public async isAvailable(): Promise<boolean> {
    return false;
  }

  public async getAccessStatus(): Promise<SensorAccessStatus> {
    return 'unavailable';
  }

  public async requestAccess(): Promise<SensorAccessStatus> {
    return 'unavailable';
  }

  public setUpdateInterval(): void {
    // Deliberately a silent fallback for simulators and unsupported browsers.
  }

  public start(): SensorSubscription {
    return { remove: () => undefined };
  }

  public getSubscriptionCount(): number {
    return 0;
  }
}

export class MockAccelerometerSensor implements AccelerometerSensor {
  private listener: ((sample: AccelerometerSample) => void) | null = null;
  private listenerCount = 0;
  public lastIntervalMs: number | null = null;
  public accessStatus: SensorAccessStatus = 'granted';
  public available = true;

  public async isAvailable(): Promise<boolean> {
    return this.available;
  }

  public async getAccessStatus(): Promise<SensorAccessStatus> {
    return this.available ? this.accessStatus : 'unavailable';
  }

  public async requestAccess(): Promise<SensorAccessStatus> {
    return this.available ? this.accessStatus : 'unavailable';
  }

  public setUpdateInterval(intervalMs: number): void {
    this.lastIntervalMs = intervalMs;
  }

  public start(
    onSample: (sample: AccelerometerSample) => void,
    _onError: (error: Error) => void,
  ): SensorSubscription {
    this.listener = onSample;
    this.listenerCount += 1;
    let removed = false;
    return {
      remove: () => {
        if (removed) return;
        removed = true;
        this.listener = null;
        this.listenerCount = Math.max(0, this.listenerCount - 1);
      },
    };
  }

  public emit(sample: AccelerometerSample): void {
    this.listener?.(sample);
  }

  public getSubscriptionCount(): number {
    return this.listenerCount;
  }
}
