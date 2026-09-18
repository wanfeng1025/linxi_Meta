import * as Haptics from 'expo-haptics';

export type HapticSignal = 'candidate' | 'cast-success' | 'session-complete' | 'error';

export interface HapticFeedback {
  trigger(signal: HapticSignal): Promise<void>;
}

export class ExpoHapticFeedback implements HapticFeedback {
  public async trigger(signal: HapticSignal): Promise<void> {
    switch (signal) {
      case 'candidate':
        await Haptics.selectionAsync();
        return;
      case 'cast-success':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;
      case 'session-complete':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }
}

export class NoopHapticFeedback implements HapticFeedback {
  public async trigger(): Promise<void> {
    // Unsupported devices and opted-out users intentionally receive no feedback.
  }
}
