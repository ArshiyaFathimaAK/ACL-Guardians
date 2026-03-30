import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, Vibration, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import RiskLineChart from '@/components/risk-line-chart';
import { ACLTheme } from '@/constants/acl-theme';
import { useHardwareStream } from '@/hooks/use-hardware-stream';
import { useTraining } from '@/state/training-store';
import { safeGoBack } from '@/utils/navigation';

const STREAM_WINDOW_MS = 5_000;

function getRiskScore(
  z: number,
  kneeY2: number,
  motionState: 'rest' | 'good' | 'bad' | 'warning' | 'transient' | 'unknown',
  frequencyHz: number,
  goodY2Max: number,
  badY2Min: number
) {
  const thresholdGap = Math.max(0.5, badY2Min - goodY2Max);

  // Keep frontend alerts synchronized with firmware state first.
  if (motionState === 'bad') {
    const severity = Math.min(1, Math.abs(kneeY2 - badY2Min) / thresholdGap);
    return Math.round(82 + severity * 18);
  }

  if (motionState === 'good') {
    return 16;
  }

  if (motionState === 'rest') {
    return 8;
  }

  if (motionState === 'transient') {
    const freqPenalty = Math.min(1, frequencyHz / 2.2);
    return Math.round(48 + freqPenalty * 18);
  }

  if (motionState === 'warning') {
    const freqPenalty = Math.min(1, frequencyHz / 2.2);
    return Math.round(52 + freqPenalty * 15);
  }

  // Fallback only when state is unknown (e.g., older firmware payload).
  if (kneeY2 <= goodY2Max) {
    return 18;
  }

  if (kneeY2 >= badY2Min) {
    return 88;
  }

  if (z >= -2 && z <= 2) {
    return 10;
  }

  return 35;
}

export default function LiveSessionScreen() {
  const { snapshot, error } = useHardwareStream(450);
  const {
    selectedExercise,
    trackingEnabled,
    liveRiskTrend,
    liveRiskLevel,
    startTracking,
    stopTracking,
    ingestRiskSample,
  } = useTraining();
  const startTrackingRef = useRef(startTracking);
  const ingestRiskSampleRef = useRef(ingestRiskSample);
  const hasStartedTrackingRef = useRef(false);
  const lastSampleTimeRef = useRef(0);
  const [liveTimeTrend, setLiveTimeTrend] = useState<number[]>([]);
  const alertLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousAlertLevelRef = useRef<'safe' | 'warning' | 'high'>('safe');
  const { width } = useWindowDimensions();

  const riskScore = getRiskScore(
    snapshot.z,
    snapshot.kneeY2,
    snapshot.motionState,
    snapshot.frequencyHz,
    snapshot.goodY2Max,
    snapshot.badY2Min,
  );

  const riskColor =
    riskScore >= 75
      ? ACLTheme.colors.high
      : riskScore >= 45
        ? ACLTheme.colors.warning
        : ACLTheme.colors.safe;

  const derivedLevel = riskScore >= 75 ? 'high' : riskScore >= 45 ? 'warning' : 'safe';

  const visibleTrend = (() => {
    if (!liveTimeTrend.length || liveTimeTrend.length !== liveRiskTrend.length) {
      return {
        values: liveRiskTrend.length ? liveRiskTrend : [riskScore],
        times: liveTimeTrend,
      };
    }

    const latestTime = liveTimeTrend[liveTimeTrend.length - 1];
    const startTime = latestTime - STREAM_WINDOW_MS;
    const startIndex = liveTimeTrend.findIndex((time) => time >= startTime);

    if (startIndex < 0) {
      return {
        values: liveRiskTrend,
        times: liveTimeTrend,
      };
    }

    const values = liveRiskTrend.slice(startIndex);
    const times = liveTimeTrend.slice(startIndex);

    return {
      values: values.length ? values : [riskScore],
      times,
    };
  })();

  useEffect(() => {
    startTrackingRef.current = startTracking;
  }, [startTracking]);

  useEffect(() => {
    ingestRiskSampleRef.current = ingestRiskSample;
  }, [ingestRiskSample]);

  useEffect(() => {
    if (!hasStartedTrackingRef.current && !trackingEnabled) {
      hasStartedTrackingRef.current = true;
      startTrackingRef.current();
    }
  }, [trackingEnabled]);

  useEffect(() => {
    if (!snapshot.sampleTimeMs || snapshot.sampleTimeMs === lastSampleTimeRef.current) {
      return;
    }

    lastSampleTimeRef.current = snapshot.sampleTimeMs;
    ingestRiskSampleRef.current(riskScore, derivedLevel);
    setLiveTimeTrend((prev) => [...prev.slice(-79), snapshot.sampleTimeMs]);
  }, [riskScore, derivedLevel, snapshot.sampleTimeMs]);

  useEffect(() => {
    if (!trackingEnabled) {
      setLiveTimeTrend([]);
      lastSampleTimeRef.current = 0;
    }
  }, [trackingEnabled]);

  useEffect(() => {
    if (alertLoopRef.current) {
      clearInterval(alertLoopRef.current);
      alertLoopRef.current = null;
    }
    Vibration.cancel();

    if (derivedLevel === 'safe') {
      previousAlertLevelRef.current = 'safe';
      return;
    }

    const triggerPattern = async () => {
      try {
        if (Platform.OS !== 'web') {
          if (derivedLevel === 'high') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      } catch {
        // Ignore and continue with vibration fallback.
      }

      if (derivedLevel === 'high') {
        Vibration.vibrate([0, 120, 120]);
      } else {
        Vibration.vibrate([0, 85]);
      }
    };

    if (derivedLevel === 'warning') {
      if (previousAlertLevelRef.current !== 'warning') {
        void triggerPattern();
      }
      previousAlertLevelRef.current = 'warning';
      return;
    }

    // High cadence mirrors buzzer pulse cadence (~120ms on/off => ~240ms cycle).
    const highCadence = Math.max(220, Math.round(340 - Math.max(0, riskScore - 75) * 2));
    void triggerPattern();
    alertLoopRef.current = setInterval(() => {
      void triggerPattern();
    }, highCadence);
    previousAlertLevelRef.current = 'high';

    return () => {
      if (alertLoopRef.current) {
        clearInterval(alertLoopRef.current);
        alertLoopRef.current = null;
      }
      Vibration.cancel();
    };
  }, [derivedLevel, riskScore]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Live Monitor" showBack onBackPress={() => safeGoBack('/session/calibrate')} />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Exercise</Text>
          <Text style={styles.title}>{selectedExercise.name}</Text>
          <Text style={styles.meta}>Target {selectedExercise.targetAngleMin}-{selectedExercise.targetAngleMax} deg</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Hardware Data (Realtime)</Text>
          <Text style={styles.metric}>Angle: {snapshot.angle.toFixed(1)} deg</Text>
          <Text style={styles.metric}>Z-axis: {snapshot.z.toFixed(2)} m/s^2</Text>
          <Text style={styles.metric}>Pitch: {snapshot.pitch.toFixed(1)} deg</Text>
          <Text style={styles.metric}>Roll: {snapshot.roll.toFixed(1)} deg</Text>
          <Text style={styles.metric}>Frequency: {snapshot.frequencyHz.toFixed(2)} Hz</Text>
          <Text style={styles.metric}>Knee y2: {snapshot.kneeY2.toFixed(2)}</Text>
          <Text style={styles.metric}>Knee diff: {snapshot.kneeDiff.toFixed(2)}</Text>
          <Text style={styles.meta}>
            {`Thresholds y2: good <= ${snapshot.goodY2Max.toFixed(2)}, bad >= ${snapshot.badY2Min.toFixed(2)}`}
          </Text>
          <Text style={styles.metric}>Motion state: {snapshot.motionState}</Text>
          <Text style={styles.meta}>Source: {snapshot.sourceUrl}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.riskHeaderRow}>
            <Text style={styles.label}>Risk</Text>
            <Text style={[styles.riskValue, { color: riskColor }]}>
              {liveRiskLevel === 'high' ? 'High' : liveRiskLevel === 'warning' ? 'Caution' : 'Stable'}
            </Text>
          </View>
          <Text style={styles.meta}>Live window: last 5s</Text>
          <View style={styles.lineChart}>
            <RiskLineChart
              data={visibleTrend.values}
              timestamps={visibleTrend.times}
              lineMode="smooth"
              width={Math.max(220, width - ACLTheme.spacing.lg * 4 - 16)}
              height={132}
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.logButton, pressed && styles.pressed]}
          onPress={() => {
            stopTracking();
            router.replace('/(tabs)/sessions');
          }}>
          <Text style={styles.logButtonText}>End Session</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ACLTheme.colors.background,
  },
  content: {
    padding: ACLTheme.spacing.lg,
    gap: ACLTheme.spacing.md,
  },
  card: {
    backgroundColor: ACLTheme.colors.surface,
    borderRadius: ACLTheme.radius.lg,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    padding: ACLTheme.spacing.lg,
    gap: ACLTheme.spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: ACLTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: ACLTheme.fonts.body,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: ACLTheme.colors.text,
    fontFamily: ACLTheme.fonts.title,
  },
  metric: {
    fontSize: 16,
    fontWeight: '700',
    color: ACLTheme.colors.text,
    fontFamily: ACLTheme.fonts.body,
  },
  meta: {
    fontSize: 13,
    color: ACLTheme.colors.textMuted,
    fontFamily: ACLTheme.fonts.body,
  },
  error: {
    color: ACLTheme.colors.warning,
    fontSize: 12,
  },
  riskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskValue: {
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily: ACLTheme.fonts.body,
  },
  lineChart: {
    minHeight: 144,
    borderRadius: ACLTheme.radius.md,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: '#131a27',
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logButton: {
    backgroundColor: ACLTheme.colors.primary,
    borderRadius: ACLTheme.radius.lg,
    alignItems: 'center',
    paddingVertical: ACLTheme.spacing.md,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: ACLTheme.fonts.body,
  },
  pressed: {
    opacity: 0.9,
  },
});
