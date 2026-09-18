import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  DEFAULT_SHAKE_DETECTOR_CONFIG,
  ShakeDetector,
  type ShakeDetectorConfig,
  type ShakeDetectorState,
} from '@/domain/device';
import type { HapticFeedback } from '@/infrastructure/haptics';
import type {
  AccelerometerSensor,
  SensorAccessStatus,
  SensorSubscription,
} from '@/infrastructure/sensors';

export type ShakeAvailability =
  'checking' | 'ready' | 'permission-required' | 'denied' | 'unsupported';

export interface ShakeDiagnostics {
  readonly availability: ShakeAvailability;
  readonly accessStatus: SensorAccessStatus;
  readonly detectorState: ShakeDetectorState;
  readonly strength: number;
  readonly axes: Readonly<{ x: number; y: number; z: number }> | null;
  readonly lastTriggeredAt: number | null;
  readonly subscriptionCount: number;
  readonly error: string | null;
  readonly errorLog: readonly string[];
}

export interface UseShakeToCastOptions {
  readonly sensor: AccelerometerSensor;
  readonly haptics: HapticFeedback;
  readonly enabled: boolean;
  readonly sessionComplete: boolean;
  readonly blocked: boolean;
  readonly onValidShake: () => Promise<void>;
  readonly hapticsEnabled: boolean;
  readonly reducedHaptics: boolean;
  readonly sampleIntervalMs?: number;
  readonly config?: ShakeDetectorConfig;
}

const INITIAL_DIAGNOSTICS: ShakeDiagnostics = {
  availability: 'checking',
  accessStatus: 'undetermined',
  detectorState: 'disabled',
  strength: 0,
  axes: null,
  lastTriggeredAt: null,
  subscriptionCount: 0,
  error: null,
  errorLog: [],
};

export function useShakeToCast({
  sensor,
  haptics,
  enabled,
  sessionComplete,
  blocked,
  onValidShake,
  hapticsEnabled,
  reducedHaptics,
  sampleIntervalMs = 50,
  config = DEFAULT_SHAKE_DETECTOR_CONFIG,
}: UseShakeToCastOptions): {
  readonly diagnostics: ShakeDiagnostics;
  readonly requestAccess: () => Promise<void>;
} {
  const detector = useRef(new ShakeDetector(config));
  const subscription = useRef<SensorSubscription | null>(null);
  const triggering = useRef(false);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [accessRevision, setAccessRevision] = useState(0);
  const [diagnostics, setDiagnostics] = useState<ShakeDiagnostics>(INITIAL_DIAGNOSTICS);
  const latest = useRef({
    focused,
    foreground,
    enabled,
    sessionComplete,
    blocked,
    onValidShake,
    hapticsEnabled,
    reducedHaptics,
  });
  useEffect(() => {
    latest.current = {
      focused,
      foreground,
      enabled,
      sessionComplete,
      blocked,
      onValidShake,
      hapticsEnabled,
      reducedHaptics,
    };
  }, [
    blocked,
    enabled,
    focused,
    foreground,
    hapticsEnabled,
    onValidShake,
    reducedHaptics,
    sessionComplete,
  ]);

  const publish = useCallback(
    (patch: Partial<ShakeDiagnostics>) => {
      setDiagnostics((current) => ({
        ...current,
        ...patch,
        detectorState: detector.current.getState(),
        subscriptionCount: sensor.getSubscriptionCount(),
      }));
    },
    [sensor],
  );

  const stop = useCallback(() => {
    subscription.current?.remove();
    subscription.current = null;
    detector.current.disable();
    publish({});
  }, [publish]);

  const reportError = useCallback(
    (message: string) => {
      setDiagnostics((current) => ({
        ...current,
        error: message,
        errorLog: [...current.errorLog, message].slice(-5),
        detectorState: detector.current.getState(),
        subscriptionCount: sensor.getSubscriptionCount(),
      }));
    },
    [sensor],
  );

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setForeground(nextState === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const shouldListen = focused && foreground && enabled && !sessionComplete;
    if (!shouldListen) {
      stop();
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        if (!(await sensor.isAvailable())) {
          if (!cancelled)
            publish({ availability: 'unsupported', accessStatus: 'unavailable', error: null });
          return;
        }
        const accessStatus = await sensor.getAccessStatus();
        if (cancelled) return;
        if (accessStatus !== 'granted') {
          publish({
            availability: accessStatus === 'denied' ? 'denied' : 'permission-required',
            accessStatus,
            error: null,
          });
          return;
        }
        detector.current.enable();
        sensor.setUpdateInterval(sampleIntervalMs);
        publish({ availability: 'ready', accessStatus, error: null });
        subscription.current = sensor.start(
          (sample) => {
            const current = latest.current;
            if (
              !current.focused ||
              !current.foreground ||
              !current.enabled ||
              current.sessionComplete ||
              current.blocked ||
              triggering.current
            ) {
              return;
            }
            const events = detector.current.ingest(sample);
            publish({
              axes: { x: sample.x, y: sample.y, z: sample.z },
              strength: detector.current.getLastStrength(),
            });
            for (const event of events) {
              if (event.type === 'shake-start') {
                if (current.hapticsEnabled && !current.reducedHaptics) {
                  void haptics.trigger('candidate').catch(() => undefined);
                }
                continue;
              }
              if (event.type !== 'valid-shake') continue;
              triggering.current = true;
              detector.current.acknowledgeTrigger(event.timestampMs);
              publish({ lastTriggeredAt: event.timestampMs, strength: event.strength });
              void current
                .onValidShake()
                .catch(() => undefined)
                .finally(() => {
                  triggering.current = false;
                  publish({});
                });
            }
          },
          (error) => reportError(error.message),
        );
        publish({});
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'Accelerometer initialization failed.';
          publish({ availability: 'unsupported' });
          reportError(message);
        }
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [
    accessRevision,
    enabled,
    focused,
    foreground,
    haptics,
    publish,
    reportError,
    sampleIntervalMs,
    sensor,
    sessionComplete,
    stop,
  ]);

  useEffect(() => stop, [stop]);

  const requestAccess = useCallback(async (): Promise<void> => {
    try {
      const accessStatus = await sensor.requestAccess();
      publish({ accessStatus, error: null });
      setAccessRevision((revision) => revision + 1);
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Motion permission request failed.');
    }
  }, [publish, reportError, sensor]);

  return { diagnostics, requestAccess };
}
