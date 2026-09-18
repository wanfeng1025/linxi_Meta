import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState } from 'react-native';

export function useCoinRevealAnimation(): {
  readonly progress: Animated.Value;
  readonly play: (durationMs: number) => Promise<void>;
} {
  const [progress] = useState(() => new Animated.Value(1));
  const resolve = useRef<(() => void) | null>(null);

  const finish = useCallback(() => {
    progress.stopAnimation();
    progress.setValue(1);
    const pending = resolve.current;
    resolve.current = null;
    pending?.();
  }, [progress]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') finish();
    });
    return () => {
      subscription.remove();
      finish();
    };
  }, [finish]);

  const play = useCallback(
    (durationMs: number): Promise<void> => {
      finish();
      if (durationMs <= 0) return Promise.resolve();
      progress.setValue(0);
      return new Promise((done) => {
        resolve.current = done;
        Animated.timing(progress, {
          toValue: 1,
          duration: durationMs,
          useNativeDriver: true,
        }).start(finish);
      });
    },
    [finish, progress],
  );

  return { progress, play };
}
