/**
 * Synthetic ECG signal generator using Gaussian peaks for PQRST morphology.
 * Generates data at 250Hz sample rate.
 */

const SAMPLE_RATE = 250;
const BEAT_DURATION = 0.8; // seconds per beat (~75 BPM)

function gaussian(x: number, amplitude: number, center: number, width: number): number {
  return amplitude * Math.exp(-Math.pow(x - center, 2) / (2 * Math.pow(width, 2)));
}

/**
 * Generate a single PQRST complex.
 * Returns an array of amplitude values for one heartbeat.
 */
function generateBeat(): number[] {
  const samplesPerBeat = Math.round(SAMPLE_RATE * BEAT_DURATION);
  const beat: number[] = [];

  for (let i = 0; i < samplesPerBeat; i++) {
    const t = i / SAMPLE_RATE;

    // P wave: small positive deflection
    const p = gaussian(t, 0.12, 0.1, 0.025);

    // Q wave: small negative deflection before R
    const q = gaussian(t, -0.08, 0.2, 0.012);

    // R wave: large positive spike
    const r = gaussian(t, 1.0, 0.23, 0.012);

    // S wave: negative deflection after R
    const s = gaussian(t, -0.2, 0.26, 0.012);

    // T wave: broader positive deflection
    const tWave = gaussian(t, 0.25, 0.4, 0.04);

    // Baseline with small noise
    const noise = (Math.random() - 0.5) * 0.02;

    beat.push(p + q + r + s + tWave + noise);
  }

  return beat;
}

/**
 * Generate a synthetic ECG signal for a given duration.
 * @param durationSeconds Length of signal in seconds
 * @returns Array of amplitude values at 250Hz
 */
export function generateECGSignal(durationSeconds: number = 10): number[] {
  const totalSamples = Math.round(SAMPLE_RATE * durationSeconds);
  const signal: number[] = [];
  const beat = generateBeat();

  while (signal.length < totalSamples) {
    // Add slight variation in beat timing
    const variation = 0.95 + Math.random() * 0.1;
    const modifiedBeat = beat.map((v) => v * variation);
    signal.push(...modifiedBeat);
  }

  return signal.slice(0, totalSamples);
}

/**
 * Pre-generated ECG signal buffer for animation use.
 * 30 seconds of data = 7500 samples.
 */
export const ecgSignalBuffer = generateECGSignal(30);

export { SAMPLE_RATE };
