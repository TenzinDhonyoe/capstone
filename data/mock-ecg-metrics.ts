export interface ECGMetrics {
  heartRate: number;
  hrv: number;
  prInterval: number;
  qtInterval: number;
  rhythm: string;
  signalQuality: number;
}

export const defaultECGMetrics: ECGMetrics = {
  heartRate: 72,
  hrv: 48,
  prInterval: 162,
  qtInterval: 398,
  rhythm: 'Normal Sinus Rhythm',
  signalQuality: 85,
};

/**
 * Returns slightly varied metrics to simulate live updates.
 */
export function getVariedMetrics(base: ECGMetrics): ECGMetrics {
  const vary = (value: number, range: number) =>
    Math.round(value + (Math.random() - 0.5) * range);

  return {
    heartRate: Math.max(50, Math.min(120, vary(base.heartRate, 6))),
    hrv: Math.max(15, Math.min(80, vary(base.hrv, 8))),
    prInterval: Math.max(120, Math.min(200, vary(base.prInterval, 10))),
    qtInterval: Math.max(350, Math.min(460, vary(base.qtInterval, 12))),
    rhythm: base.rhythm,
    signalQuality: Math.max(60, Math.min(100, vary(base.signalQuality, 5))),
  };
}
