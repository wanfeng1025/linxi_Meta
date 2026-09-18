import { describe, expect, it } from 'vitest';

import { ShakeDetector, type AccelerometerSample } from '../../src/domain/device';

function sample(x: number, timestampMs: number): AccelerometerSample {
  return { x, y: 0, z: 1, timestampMs };
}

function validShakeSamples(): readonly AccelerometerSample[] {
  return [
    sample(0, 0),
    sample(1.2, 50),
    sample(-0.2, 100),
    sample(1.2, 150),
    sample(-0.2, 200),
    sample(0, 250),
    sample(0, 300),
    sample(0, 350),
  ];
}

describe('ShakeDetector', () => {
  it('recognises one complete shake only after direction change, duration, peak, and settle samples', () => {
    const detector = new ShakeDetector();
    const events = validShakeSamples().flatMap((item) => detector.ingest(item));

    expect(events.map((event) => event.type)).toEqual(['shake-start', 'shake-end', 'valid-shake']);
    expect(detector.getState()).toBe('triggered');
    expect(detector.getLastStrength()).toBe(0);
  });

  it('requires acknowledgement and cooldown so a continuous violent movement cannot cast twice', () => {
    const detector = new ShakeDetector();
    const first = validShakeSamples().flatMap((item) => detector.ingest(item));
    expect(first.filter((event) => event.type === 'valid-shake')).toHaveLength(1);

    detector.acknowledgeTrigger(350);
    expect(detector.getState()).toBe('cooldown');
    const duringCooldown = validShakeSamples().flatMap((item) =>
      detector.ingest({ ...item, timestampMs: item.timestampMs + 500 }),
    );
    expect(duringCooldown).toEqual([]);

    const second = validShakeSamples().flatMap((item) =>
      detector.ingest({ ...item, timestampMs: item.timestampMs + 2_000 }),
    );
    expect(second.filter((event) => event.type === 'valid-shake')).toHaveLength(1);
  });

  it('rejects a single collision and low amplitude table noise', () => {
    const detector = new ShakeDetector();
    const collision = [
      sample(0, 0),
      sample(1.5, 50),
      sample(0, 100),
      sample(0, 150),
      sample(0, 200),
    ];
    const noise = [sample(0.01, 300), sample(0.04, 350), sample(0.02, 400), sample(0.03, 450)];
    const events = [...collision, ...noise].flatMap((item) => detector.ingest(item));

    expect(events.some((event) => event.type === 'valid-shake')).toBe(false);
    expect(events.some((event) => event.type === 'noise')).toBe(true);
    expect(detector.getState()).toBe('idle');
  });

  it('stays disabled after the sixth line or page cleanup until explicitly enabled again', () => {
    const detector = new ShakeDetector();
    detector.disable();
    expect(validShakeSamples().flatMap((item) => detector.ingest(item))).toEqual([]);
    expect(detector.getState()).toBe('disabled');

    detector.enable();
    expect(validShakeSamples().flatMap((item) => detector.ingest(item))).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'valid-shake' })]),
    );
  });
});
