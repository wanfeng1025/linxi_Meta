export interface AccelerometerSample {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly timestampMs: number;
}

export type ShakeDetectorState =
  'idle' | 'candidate' | 'shaking' | 'triggered' | 'cooldown' | 'disabled';

export type ShakeDetectorEvent =
  | {
      readonly type: 'shake-start';
      readonly strength: number;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'valid-shake';
      readonly strength: number;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'shake-end';
      readonly strength: number;
      readonly timestampMs: number;
    }
  | {
      readonly type: 'noise';
      readonly strength: number;
      readonly timestampMs: number;
    };

export interface ShakeDetectorConfig {
  /** Difference between consecutive acceleration vectors, measured in g. */
  readonly candidateThreshold: number;
  readonly peakThreshold: number;
  readonly settleThreshold: number;
  readonly minimumSampleCount: number;
  readonly minimumDurationMs: number;
  readonly minimumDirectionChanges: number;
  readonly settledSampleCount: number;
  readonly candidateTimeoutMs: number;
  readonly cooldownMs: number;
}

export const DEFAULT_SHAKE_DETECTOR_CONFIG: Readonly<ShakeDetectorConfig> = Object.freeze({
  candidateThreshold: 0.55,
  peakThreshold: 1.05,
  settleThreshold: 0.22,
  minimumSampleCount: 4,
  minimumDurationMs: 180,
  minimumDirectionChanges: 1,
  settledSampleCount: 3,
  candidateTimeoutMs: 900,
  cooldownMs: 1200,
});

interface Vector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function magnitude(vector: Vector): number {
  return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
}

function difference(current: AccelerometerSample, previous: AccelerometerSample): Vector {
  return { x: current.x - previous.x, y: current.y - previous.y, z: current.z - previous.z };
}

function dot(left: Vector, right: Vector): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

/**
 * Device-only gesture recognizer. It never creates coins or reads randomness.
 * Thresholds are intentionally supplied as data so Android and iOS can be calibrated independently.
 */
export class ShakeDetector {
  private state: ShakeDetectorState = 'idle';
  private previousSample: AccelerometerSample | null = null;
  private candidateStartedAt: number | null = null;
  private sampleCount = 0;
  private peakStrength = 0;
  private settledSamples = 0;
  private directionChanges = 0;
  private previousDirection: Vector | null = null;
  private cooldownUntil = 0;
  private lastStrength = 0;

  public constructor(
    private readonly config: ShakeDetectorConfig = DEFAULT_SHAKE_DETECTOR_CONFIG,
  ) {}

  public getState(): ShakeDetectorState {
    return this.state;
  }

  public getConfig(): ShakeDetectorConfig {
    return this.config;
  }

  public getLastStrength(): number {
    return this.lastStrength;
  }

  public disable(): void {
    this.reset('disabled');
  }

  public enable(): void {
    if (this.state === 'disabled') this.reset('idle');
  }

  public acknowledgeTrigger(timestampMs: number): void {
    if (this.state !== 'triggered') return;
    this.cooldownUntil = timestampMs + this.config.cooldownMs;
    this.reset('cooldown');
  }

  public reset(state: ShakeDetectorState = 'idle'): void {
    this.state = state;
    this.previousSample = null;
    this.candidateStartedAt = null;
    this.sampleCount = 0;
    this.peakStrength = 0;
    this.settledSamples = 0;
    this.directionChanges = 0;
    this.previousDirection = null;
  }

  public ingest(sample: AccelerometerSample): readonly ShakeDetectorEvent[] {
    if (this.state === 'disabled') return [];
    if (this.state === 'cooldown') {
      if (sample.timestampMs < this.cooldownUntil) return [];
      this.reset('idle');
    }
    if (this.state === 'triggered') return [];

    const previous = this.previousSample;
    this.previousSample = sample;
    if (previous === null) return [];

    const vector = difference(sample, previous);
    const strength = magnitude(vector);
    this.lastStrength = strength;
    if (this.state === 'idle') return this.handleIdle(sample, vector, strength);
    return this.handleMotion(sample, vector, strength);
  }

  private handleIdle(
    sample: AccelerometerSample,
    vector: Vector,
    strength: number,
  ): readonly ShakeDetectorEvent[] {
    if (strength < this.config.candidateThreshold) return [];
    this.state = 'candidate';
    this.candidateStartedAt = sample.timestampMs;
    this.sampleCount = 1;
    this.peakStrength = strength;
    this.previousDirection = vector;
    return [{ type: 'shake-start', strength, timestampMs: sample.timestampMs }];
  }

  private handleMotion(
    sample: AccelerometerSample,
    vector: Vector,
    strength: number,
  ): readonly ShakeDetectorEvent[] {
    const startedAt = this.candidateStartedAt ?? sample.timestampMs;
    const duration = sample.timestampMs - startedAt;
    if (duration > this.config.candidateTimeoutMs && this.state === 'candidate') {
      this.reset('idle');
      return [{ type: 'noise', strength, timestampMs: sample.timestampMs }];
    }

    if (strength >= this.config.candidateThreshold) {
      this.sampleCount += 1;
      this.peakStrength = Math.max(this.peakStrength, strength);
      this.settledSamples = 0;
      if (this.previousDirection !== null && dot(this.previousDirection, vector) < 0) {
        this.directionChanges += 1;
      }
      this.previousDirection = vector;
      if (this.state === 'candidate' && this.sampleCount >= this.config.minimumSampleCount) {
        this.state = 'shaking';
      }
      return [];
    }

    if (strength >= this.config.settleThreshold) return [];
    this.settledSamples += 1;
    if (this.settledSamples < this.config.settledSampleCount) return [];

    const complete =
      this.state === 'shaking' &&
      duration >= this.config.minimumDurationMs &&
      this.peakStrength >= this.config.peakThreshold &&
      this.directionChanges >= this.config.minimumDirectionChanges;
    const end: ShakeDetectorEvent = {
      type: 'shake-end',
      strength,
      timestampMs: sample.timestampMs,
    };
    if (!complete) {
      this.reset('idle');
      return [end, { type: 'noise', strength, timestampMs: sample.timestampMs }];
    }
    this.state = 'triggered';
    return [
      end,
      { type: 'valid-shake', strength: this.peakStrength, timestampMs: sample.timestampMs },
    ];
  }
}
