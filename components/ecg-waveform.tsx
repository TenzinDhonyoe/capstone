import { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Line,
  vec,
} from '@shopify/react-native-skia';

import { ecgSignalBuffer, SAMPLE_RATE } from '@/data/mock-ecg-signal';

interface ECGWaveformProps {
  width: number;
  height: number;
  isAnimating?: boolean;
  staticData?: number[];
}

const VISIBLE_SECONDS = 2.5;
const GRID_SIZE = 20;
const FPS = 30;

export function ECGWaveform({
  width,
  height,
  isAnimating = true,
  staticData,
}: ECGWaveformProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [offset, setOffset] = useState(0);

  const gridColorMajor = isDark ? '#3A1A1A' : '#FFCCC0';
  const gridColorMinor = isDark ? '#2A1212' : '#FFE0D8';
  const waveColor = isDark ? '#4ADE80' : '#22C55E';

  const visiblePoints = Math.round(SAMPLE_RATE * VISIBLE_SECONDS);
  const pointSpacing = width / visiblePoints;
  const samplesPerTick = Math.round(SAMPLE_RATE / FPS);

  const data = staticData ?? ecgSignalBuffer;

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setOffset((prev) => (prev + samplesPerTick) % data.length);
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, [isAnimating, data.length, samplesPerTick]);

  // Build the waveform path
  const waveformPath = useMemo(() => {
    const path = Skia.Path.Make();
    const baseline = height * 0.55;
    const amplitude = height * 0.4;
    const startOffset = isAnimating ? offset : 0;

    for (let i = 0; i < visiblePoints; i++) {
      const dataIndex = (startOffset + i) % data.length;
      const x = i * pointSpacing;
      const y = baseline - data[dataIndex] * amplitude;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    return path;
  }, [offset, isAnimating, height, width, data, visiblePoints, pointSpacing]);

  // Generate grid lines (memoized since they don't change with offset)
  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
    for (let x = 0; x <= width; x += GRID_SIZE) {
      lines.push({ x1: x, y1: 0, x2: x, y2: height, major: x % (GRID_SIZE * 5) === 0 });
    }
    for (let y = 0; y <= height; y += GRID_SIZE) {
      lines.push({ x1: 0, y1: y, x2: width, y2: y, major: y % (GRID_SIZE * 5) === 0 });
    }
    return lines;
  }, [width, height]);

  return (
    <View style={[styles.container, { width, height, backgroundColor: isDark ? '#1A0A0A' : '#FFF5F5' }]}>
      <Canvas style={{ width, height }}>
        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <Line
            key={i}
            p1={vec(line.x1, line.y1)}
            p2={vec(line.x2, line.y2)}
            color={line.major ? gridColorMajor : gridColorMinor}
            strokeWidth={line.major ? 0.8 : 0.4}
          />
        ))}
        {/* ECG waveform */}
        <Path
          path={waveformPath}
          color={waveColor}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
