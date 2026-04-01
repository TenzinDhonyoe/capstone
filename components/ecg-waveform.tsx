import { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, useColorScheme } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Line,
  Circle,
  vec,
} from '@shopify/react-native-skia';

import { ecgSignalBuffer, SAMPLE_RATE } from '@/data/mock-ecg-signal';

export interface WaveformAnnotation {
  sampleIndex: number;  // index into the data buffer
  color: string;        // e.g. '#4CAF50' green, '#FF9800' amber, '#FF5722' orange
  size?: number;        // dot radius, default 4
}

interface ECGWaveformProps {
  width: number;
  height: number;
  isAnimating?: boolean;
  staticData?: number[];
  annotations?: WaveformAnnotation[];
}

const VISIBLE_SECONDS = 2.5;
const GRID_SIZE = 20;
const FPS = 30;

export function ECGWaveform({
  width,
  height,
  isAnimating = true,
  staticData,
  annotations,
}: ECGWaveformProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [offset, setOffset] = useState(0);

  const gridColorMajor = isDark ? '#3A1A1A' : '#FFCCC0';
  const gridColorMinor = isDark ? '#2A1212' : '#FFE0D8';
  const waveColor = isDark ? '#4ADE80' : '#22C55E';
  const textColor = isDark ? '#666666' : '#999999';

  const visiblePoints = Math.round(SAMPLE_RATE * VISIBLE_SECONDS);
  const pointSpacing = width / visiblePoints;
  const samplesPerTick = Math.round(SAMPLE_RATE / FPS);

  // Determine data source:
  // - staticData provided with data: use real data
  // - staticData provided but empty: show "waiting" state
  // - staticData undefined: use mock signal (disconnected preview)
  const isWaiting = staticData !== undefined && staticData.length === 0;
  const data = isWaiting ? null : (staticData ?? ecgSignalBuffer);

  useEffect(() => {
    if (!isAnimating || !data || data.length === 0) return;

    const interval = setInterval(() => {
      setOffset((prev) => (prev + samplesPerTick) % data.length);
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, [isAnimating, data?.length, samplesPerTick]);

  // Build the waveform path
  const waveformPath = useMemo(() => {
    if (!data || data.length === 0) return null;

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

  // Flat line path for waiting state
  const flatLinePath = useMemo(() => {
    if (!isWaiting) return null;
    const path = Skia.Path.Make();
    const baseline = height * 0.55;
    path.moveTo(0, baseline);
    path.lineTo(width, baseline);
    return path;
  }, [isWaiting, height, width]);

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
        {/* ECG waveform or flat line */}
        {waveformPath && (
          <Path
            path={waveformPath}
            color={waveColor}
            style="stroke"
            strokeWidth={2}
            strokeCap="round"
            strokeJoin="round"
          />
        )}
        {flatLinePath && (
          <Path
            path={flatLinePath}
            color={waveColor}
            style="stroke"
            strokeWidth={1.5}
            strokeCap="round"
          />
        )}
        {/* Beat classification annotations */}
        {data && annotations && annotations.map((annotation, idx) => {
          const startOffset = isAnimating ? offset : 0;
          // Map sampleIndex to visible position
          const relativeIndex = annotation.sampleIndex - startOffset;
          // Handle wrap-around for circular buffer
          const wrappedIndex = relativeIndex >= 0
            ? relativeIndex
            : relativeIndex + data.length;

          // Only render if within visible window
          if (wrappedIndex < 0 || wrappedIndex >= visiblePoints) return null;

          const x = wrappedIndex * pointSpacing;
          const dataIndex = annotation.sampleIndex % data.length;
          const baseline = height * 0.55;
          const amplitude = height * 0.4;
          const y = baseline - data[dataIndex] * amplitude;
          const dotSize = annotation.size ?? 4;

          return (
            <Circle
              key={`ann-${idx}`}
              cx={x}
              cy={y}
              r={dotSize}
              color={annotation.color}
            />
          );
        })}
      </Canvas>
      {isWaiting && (
        <View style={styles.waitingOverlay}>
          <Text style={[styles.waitingText, { color: textColor }]}>
            Waiting for signal...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
