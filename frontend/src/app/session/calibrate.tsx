import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ACLTheme } from '@/constants/acl-theme';
import { useHardwareStream } from '@/hooks/use-hardware-stream';
import { useTraining } from '@/state/training-store';
import { safeGoBack } from '@/utils/navigation';

export default function CalibrateScreen() {
  const { snapshot, error } = useHardwareStream(600);
  const { startPositioning, completeCalibration } = useTraining();

  const canStart = snapshot.connected && snapshot.aligned;
  const firmwareGuidance = `Target y2: good <= ${snapshot.goodY2Max.toFixed(2)} | bad >= ${snapshot.badY2Min.toFixed(2)}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Calibrate" showBack onBackPress={() => safeGoBack('/session/select')} />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Hardware Status</Text>
          <Text style={styles.metric}>Connection: {snapshot.connected ? 'Connected' : 'Not connected'}</Text>
          <Text style={styles.metric}>Motion state: {snapshot.motionState}</Text>
          <Text style={styles.metric}>Knee y2: {snapshot.kneeY2.toFixed(2)}</Text>
          <Text style={styles.metric}>Knee diff: {snapshot.kneeDiff.toFixed(2)}</Text>
          <Text style={styles.meta}>{firmwareGuidance}</Text>

          <View style={[styles.alignmentPill, canStart ? styles.aligned : styles.notAligned]}>
            <Ionicons
              name={canStart ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              size={16}
              color={canStart ? ACLTheme.colors.safe : ACLTheme.colors.warning}
            />
            <Text style={styles.alignmentText}>
              {canStart
                ? 'Aligned for dual-sensor 90-degree setup'
                : 'Adjust knee module angle until state is good/warning'}
            </Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Pressable
          onPress={() => {
            startPositioning();
            completeCalibration();
            router.push('/session/live');
          }}
          disabled={!canStart}
          style={({ pressed }) => [
            styles.startButton,
            !canStart && styles.startButtonDisabled,
            pressed && canStart && styles.pressed,
          ]}>
          <Text style={styles.startText}>Start Live Session</Text>
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
    gap: ACLTheme.spacing.lg,
  },
  card: {
    backgroundColor: ACLTheme.colors.surface,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    borderRadius: ACLTheme.radius.lg,
    padding: ACLTheme.spacing.lg,
    gap: ACLTheme.spacing.xs,
  },
  label: {
    fontSize: 13,
    color: ACLTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    fontFamily: ACLTheme.fonts.body,
  },
  metric: {
    fontSize: 15,
    color: ACLTheme.colors.text,
    fontWeight: '600',
    fontFamily: ACLTheme.fonts.body,
  },
  meta: {
    fontSize: 12,
    color: ACLTheme.colors.textMuted,
    fontFamily: ACLTheme.fonts.body,
  },
  alignmentPill: {
    marginTop: ACLTheme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ACLTheme.spacing.xs,
    borderRadius: ACLTheme.radius.md,
    paddingHorizontal: ACLTheme.spacing.sm,
    paddingVertical: ACLTheme.spacing.xs,
  },
  aligned: {
    backgroundColor: '#143025',
  },
  notAligned: {
    backgroundColor: '#332716',
  },
  alignmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: ACLTheme.colors.text,
    fontFamily: ACLTheme.fonts.body,
  },
  error: {
    color: ACLTheme.colors.warning,
    fontSize: 12,
    marginTop: ACLTheme.spacing.xs,
  },
  startButton: {
    backgroundColor: ACLTheme.colors.primary,
    borderRadius: ACLTheme.radius.lg,
    paddingVertical: ACLTheme.spacing.md,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: ACLTheme.colors.primarySoft,
  },
  startText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: ACLTheme.fonts.body,
  },
  pressed: {
    opacity: 0.9,
  },
});
