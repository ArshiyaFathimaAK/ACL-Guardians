import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { ACLTheme } from '@/constants/acl-theme';

type RiskLineChartProps = {
  data: number[];
  width: number;
  height?: number;
  timestamps?: number[];
  lineMode?: 'smooth' | 'linear';
};

type ChartPoint = {
  x: number;
  y: number;
  value: number;
};

const MIN_VALUE = 0;
const MAX_VALUE = 100;
const AXIS_LEFT = 26;
const AXIS_RIGHT = 6;
const AXIS_TOP = 6;
const AXIS_BOTTOM = 24;
const MAX_RENDER_POINTS = 40;

function formatAxisTime(timeMs: number) {
  const date = new Date(timeMs);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatRelativeSeconds(timeMs: number, endMs: number) {
  const sec = Math.max(0, Math.round((endMs - timeMs) / 1000));
  return sec === 0 ? 'now' : `-${sec}s`;
}

function toChartPoints(data: number[], width: number, height: number): ChartPoint[] {
  const cappedData = (data.length ? data : [0])
    .slice(-80)
    .map((value) => Math.max(MIN_VALUE, Math.min(MAX_VALUE, value)));

  const safeData =
    cappedData.length > MAX_RENDER_POINTS
      ? cappedData.filter((_, index) => index % Math.ceil(cappedData.length / MAX_RENDER_POINTS) === 0)
      : cappedData;

  const chartWidth = Math.max(20, width - AXIS_LEFT - AXIS_RIGHT);
  const chartHeight = Math.max(20, height - AXIS_TOP - AXIS_BOTTOM);
  const stepX = safeData.length > 1 ? chartWidth / (safeData.length - 1) : 0;

  return safeData.map((value, index) => {
    const x = AXIS_LEFT + stepX * index;
    const normalized = (value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE || 1);
    const y = AXIS_TOP + (1 - normalized) * chartHeight;
    return { x, y, value };
  });
}

function toLinearPath(points: ChartPoint[]) {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  return points.reduce((path, point, index) => {
    return `${path}${index === 0 ? 'M' : ' L'} ${point.x} ${point.y}`;
  }, '');
}

function toSmoothPath(points: ChartPoint[]) {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

function getPeakPoints(points: ChartPoint[]) {
  if (points.length < 3) {
    return [];
  }

  const peaks: ChartPoint[] = [];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];

    if (current.value >= 60 && current.value >= previous.value && current.value >= next.value) {
      peaks.push(current);
    }
  }

  return peaks;
}

function RiskLineChart({ data, width, height = 132, timestamps, lineMode = 'smooth' }: RiskLineChartProps) {
  const chartWidth = Math.max(40, width);
  const trimmedData = useMemo(() => (data.length ? data : [0]).slice(-80), [data]);
  const trimmedTimestamps = useMemo(() => {
    if (!timestamps?.length) {
      return [];
    }

    return timestamps.slice(-trimmedData.length);
  }, [timestamps, trimmedData.length]);

  const points = useMemo(
    () => toChartPoints(trimmedData, chartWidth, height),
    [trimmedData, width, height]
  );

  const path = useMemo(
    () => (lineMode === 'linear' ? toLinearPath(points) : toSmoothPath(points)),
    [lineMode, points]
  );
  const peakPoints = useMemo(() => getPeakPoints(points), [points]);

  const gridRows = 4;
  const gridColumns = 8;
  const innerWidth = Math.max(20, chartWidth - AXIS_LEFT - AXIS_RIGHT);
  const innerHeight = Math.max(20, height - AXIS_TOP - AXIS_BOTTOM);
  const startTime = trimmedTimestamps[0];
  const endTime = trimmedTimestamps[trimmedTimestamps.length - 1];
  const useRelativeAxis = Boolean(startTime && endTime && endTime - startTime <= 60_000);
  const relativeTicks = useMemo(() => {
    if (!useRelativeAxis || !startTime || !endTime) {
      return [] as Array<{ key: string; x: number; label: string }>;
    }

    const spanSec = Math.max(1, Math.round((endTime - startTime) / 1000));
    const tickCount = Math.min(6, spanSec + 1);

    return Array.from({ length: tickCount }, (_, index) => {
      const ratio = tickCount > 1 ? index / (tickCount - 1) : 0;
      const time = startTime + (endTime - startTime) * ratio;
      const x = AXIS_LEFT + innerWidth * ratio;
      return {
        key: `rt-${index}`,
        x,
        label: index === tickCount - 1 ? 'now' : formatRelativeSeconds(time, endTime),
      };
    });
  }, [useRelativeAxis, startTime, endTime, innerWidth]);

  return (
    <View style={[styles.container, { width: chartWidth, height }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${height}`}>
        <Defs>
          <LinearGradient id="riskStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={ACLTheme.colors.safe} stopOpacity="1" />
            <Stop offset="0.5" stopColor={ACLTheme.colors.warning} stopOpacity="1" />
            <Stop offset="1" stopColor={ACLTheme.colors.high} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {Array.from({ length: gridColumns + 1 }, (_, index) => {
          const x = AXIS_LEFT + (innerWidth / gridColumns) * index;
          return (
            <Line
              key={`vx-${index}`}
              x1={x}
              y1={AXIS_TOP}
              x2={x}
              y2={AXIS_TOP + innerHeight}
              stroke={ACLTheme.colors.border}
              strokeWidth={index % 2 === 0 ? 1 : 0.7}
              opacity={0.55}
            />
          );
        })}

        {Array.from({ length: gridRows + 1 }, (_, index) => {
          const y = AXIS_TOP + (innerHeight / gridRows) * index;
          const label = Math.round(MAX_VALUE - (MAX_VALUE / gridRows) * index);
          return (
            <G key={`hy-wrap-${index}`}>
              <Line
                key={`hy-${index}`}
                x1={AXIS_LEFT}
                y1={y}
                x2={AXIS_LEFT + innerWidth}
                y2={y}
                stroke={ACLTheme.colors.border}
                strokeWidth={1}
                opacity={0.7}
              />
              <SvgText
                key={`yl-${index}`}
                x={4}
                y={y + 4}
                fontSize="9"
                fill={ACLTheme.colors.textMuted}>
                {label}
              </SvgText>
            </G>
          );
        })}

        <Path d={path} fill="none" stroke="url(#riskStroke)" strokeWidth="3" />

        {lineMode === 'smooth'
          ? peakPoints.map((point, index) => (
          <Rect
            key={`pk-${index}`}
            x={point.x - 3.5}
            y={point.y - 3.5}
            width={7}
            height={7}
            rx={1.5}
            fill={ACLTheme.colors.surface}
            stroke={ACLTheme.colors.warning}
            strokeWidth={1.3}
          />
          ))
          : null}

        {trimmedTimestamps.length >= 2 ? (
          <G>
            {useRelativeAxis
              ? relativeTicks.map((tick, index) => (
                  <SvgText
                    key={tick.key}
                    x={tick.x}
                    y={height - 6}
                    fontSize="9"
                    textAnchor={index === 0 ? 'start' : index === relativeTicks.length - 1 ? 'end' : 'middle'}
                    fill={ACLTheme.colors.textMuted}>
                    {tick.label}
                  </SvgText>
                ))
              : [
                  <SvgText key="abs-start" x={AXIS_LEFT} y={height - 6} fontSize="9" fill={ACLTheme.colors.textMuted}>
                    {formatAxisTime(startTime)}
                  </SvgText>,
                  <SvgText
                    key="abs-end"
                    x={AXIS_LEFT + innerWidth}
                    y={height - 6}
                    fontSize="9"
                    textAnchor="end"
                    fill={ACLTheme.colors.textMuted}>
                    {formatAxisTime(endTime)}
                  </SvgText>,
                ]}
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default memo(RiskLineChart);
