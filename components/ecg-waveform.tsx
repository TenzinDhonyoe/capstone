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

import { BLE_CONFIG } from '@/constants/ble-constants';
import { ecgSignalBuffer, SAMPLE_RATE as MOCK_SAMPLE_RATE } from '@/data/mock-ecg-signal';

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

const VISIBLE_SECONDS = 5.0;
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

  // Use BLE sample rate for real data, mock sample rate for preview
  const sampleRate = staticData ? BLE_CONFIG.SAMPLE_RATE : MOCK_SAMPLE_RATE;
  const visiblePoints = Math.round(sampleRate * VISIBLE_SECONDS);
  const pointSpacing = width / visiblePoints;
  const samplesPerTick = Math.round(sampleRate / FPS);

  // Determine data source:
  // - staticData provided with data: use real BLE data (live mode)
  // - staticData provided but empty: show "waiting" state
  // - staticData undefined: use mock signal (disconnected preview)
  const isWaiting = staticData !== undefined && staticData.length === 0;
  const isLive = staticData !== undefined && staticData.length > 0;
  const data = isWaiting ? null : (staticData ?? ecgSignalBuffer);

  // Offset animation only for mock preview (disconnected).
  // Live data always shows the buffer tail — no offset needed.
  useEffect(() => {
    if (!isAnimating || isLive || !data || data.length === 0) return;

    const interval = setInterval(() => {
      setOffset((prev) => (prev + samplesPerTick) % data.length);
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, [isAnimating, isLive, data?.length, samplesPerTick]);

  // Build the waveform path (auto-scales Y to fit visible data)
  const waveformPath = useMemo(() => {
    if (!data || data.length === 0) return null;

    const path = Skia.Path.Make();
    const margin = height * 0.1; // 10% padding top and bottom

    // Live: render the most recent visiblePoints samples (tail of buffer).
    // Mock: scroll through buffer using animated offset.
    const pointsToRender = Math.min(visiblePoints, data.length);
    const startIndex = isLive
      ? Math.max(0, data.length - visiblePoints)
      : (isAnimating ? offset : 0);

    // Find min/max of the visible window for auto-scaling
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = 0; i < pointsToRender; i++) {
      const dataIndex = isLive
        ? startIndex + i
        : (startIndex + i) % data.length;
      const v = data[dataIndex];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }

    // Avoid division by zero for flat signals
    const range = maxVal - minVal;
    const scale = range > 0 ? (height - 2 * margin) / range : 1;
    const mid = (minVal + maxVal) / 2;
    const baseline = height / 2;

    for (let i = 0; i < pointsToRender; i++) {
      const dataIndex = isLive
        ? startIndex + i
        : (startIndex + i) % data.length;
      const x = i * pointSpacing;
      const y = baseline - (data[dataIndex] - mid) * scale;

      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    return path;
  }, [offset, isAnimating, isLive, height, width, data, visiblePoints, pointSpacing]);

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
          const windowStart = isLive
            ? Math.max(0, data.length - visiblePoints)
            : (isAnimating ? offset : 0);

          const relativeIndex = isLive
            ? annotation.sampleIndex - windowStart
            : (() => {
                const rel = annotation.sampleIndex - windowStart;
                return rel >= 0 ? rel : rel + data.length;
              })();

          // Only render if within visible window
          const pointsToRender = Math.min(visiblePoints, data.length);
          if (relativeIndex < 0 || relativeIndex >= pointsToRender) return null;

          const x = relativeIndex * pointSpacing;
          const dataIndex = isLive
            ? annotation.sampleIndex
            : annotation.sampleIndex % data.length;
          if (dataIndex < 0 || dataIndex >= data.length) return null;

          // Auto-scale Y (same as waveform path)
          const margin = height * 0.1;
          let minVal = Infinity;
          let maxVal = -Infinity;
          const annStart = isLive ? Math.max(0, data.length - visiblePoints) : (isAnimating ? offset : 0);
          for (let j = 0; j < pointsToRender; j++) {
            const di = isLive ? annStart + j : (annStart + j) % data.length;
            const v = data[di];
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
          }
          const range = maxVal - minVal;
          const scale = range > 0 ? (height - 2 * margin) / range : 1;
          const mid = (minVal + maxVal) / 2;
          const baseline = height / 2;
          const y = baseline - (data[dataIndex] - mid) * scale;
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
