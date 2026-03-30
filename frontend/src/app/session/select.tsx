import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ACLTheme } from '@/constants/acl-theme';
import { useTraining } from '@/state/training-store';
import { safeGoBack } from '@/utils/navigation';

export default function SelectExerciseScreen() {
  const { exercises, selectedExerciseId, selectExercise, planExerciseForDay } = useTraining();

  const today = new Date().toISOString().slice(0, 10);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Add Exercise" showBack onBackPress={() => safeGoBack('/(tabs)')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.datePickerCard}>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={18} color={ACLTheme.colors.primary} />
            <Text style={styles.datePickerTitle}>Exercise Date</Text>
          </View>
          <View style={styles.todayChip}>
            <Ionicons name="lock-closed-outline" size={14} color={ACLTheme.colors.textMuted} />
            <Text style={styles.todayText}>{today} · Today only</Text>
          </View>
        </View>

        {exercises.map((exercise) => {
          const active = exercise.id === selectedExerciseId;
          return (
            <Pressable
              key={exercise.id}
              onPress={() => selectExercise(exercise.id)}
              style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}>
              <View style={styles.row}>
                <Ionicons name="walk-outline" size={18} color={ACLTheme.colors.primary} />
                <Text style={styles.name}>{exercise.name}</Text>
              </View>
              <Text style={styles.meta}>{exercise.targetAngleMin}-{exercise.targetAngleMax} deg · {exercise.targetFrequencyHz} Hz</Text>
            </Pressable>
          );
        })}

        <Pressable
          style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
          onPress={() => {
            planExerciseForDay(selectedExerciseId, today);
            router.push('/session/calibrate');
          }}>
          <Text style={styles.nextButtonText}>Next: Position & Calibrate</Text>
        </Pressable>
      </ScrollView>
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
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    borderRadius: ACLTheme.radius.lg,
    padding: ACLTheme.spacing.md,
    gap: ACLTheme.spacing.xs,
  },
  datePickerCard: {
    backgroundColor: ACLTheme.colors.surface,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    borderRadius: ACLTheme.radius.lg,
    padding: ACLTheme.spacing.md,
    gap: ACLTheme.spacing.sm,
  },
  datePickerTitle: {
    color: ACLTheme.colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: ACLTheme.fonts.body,
  },
  todayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ACLTheme.spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: ACLTheme.colors.surfaceMuted,
    borderRadius: ACLTheme.radius.md,
    paddingHorizontal: ACLTheme.spacing.sm,
    paddingVertical: ACLTheme.spacing.xs,
  },
  todayText: {
    color: ACLTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: ACLTheme.fonts.body,
  },
  cardActive: {
    borderColor: ACLTheme.colors.primary,
    backgroundColor: '#1a2a47',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ACLTheme.spacing.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: ACLTheme.colors.text,
    fontFamily: ACLTheme.fonts.body,
  },
  meta: {
    color: ACLTheme.colors.textMuted,
    fontSize: 13,
    fontFamily: ACLTheme.fonts.body,
  },
  nextButton: {
    backgroundColor: ACLTheme.colors.primary,
    borderRadius: ACLTheme.radius.lg,
    paddingVertical: ACLTheme.spacing.md,
    alignItems: 'center',
    marginTop: ACLTheme.spacing.sm,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: ACLTheme.fonts.body,
  },
  pressed: {
    opacity: 0.85,
  },
});
