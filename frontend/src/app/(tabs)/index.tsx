import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ACLTheme } from '@/constants/acl-theme';
import { useTraining } from '@/state/training-store';

type CalendarDay = {
  date: Date;
  isoDate: string;
  inCurrentMonth: boolean;
};

function startOfMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function buildCalendarDays(baseDate: Date): CalendarDay[] {
  const first = startOfMonth(baseDate);
  const startWeekday = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startWeekday);

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      isoDate: date.toISOString().slice(0, 10),
      inCurrentMonth: date.getMonth() === baseDate.getMonth(),
    };
  });
}

export default function CoachTabScreen() {
  const { sessions } = useTraining();
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));
  const [selectedIsoDate, setSelectedIsoDate] = useState(() => new Date().toISOString().slice(0, 10));

  const byDay = useMemo(() => {
    return sessions.reduce<Record<string, { count: number; warning: number; high: number }>>((acc, item) => {
      const sessionDate = item.startedAt ?? item.endedAt;
      const day = typeof sessionDate === 'string' ? sessionDate.slice(0, 10) : '';
      if (!day) {
        return acc;
      }

      const current = acc[day] ?? { count: 0, warning: 0, high: 0 };
      current.count += 1;
      if (item.peakRiskLevel === 'high' || item.highRiskMoments > 0 || item.injuryIndication) {
        current.high += 1;
      } else if (item.peakRiskLevel === 'warning' || item.riskPoints >= 2) {
        current.warning += 1;
      }
      acc[day] = current;
      return acc;
    }, {});
  }, [sessions]);

  const days = useMemo(() => buildCalendarDays(displayMonth), [displayMonth]);

  const monthlyCount = useMemo(() => {
    return sessions.filter((item) => {
      const sourceDate = item.startedAt ?? item.endedAt;
      const time = sourceDate ? new Date(sourceDate) : null;
      if (!time || Number.isNaN(time.getTime())) {
        return false;
      }

      return (
        time.getMonth() === displayMonth.getMonth() &&
        time.getFullYear() === displayMonth.getFullYear()
      );
    }).length;
  }, [sessions, displayMonth]);

  const selectedSessions = useMemo(() => {
    return sessions
      .filter((item) => {
        const sessionDate = item.startedAt ?? item.endedAt;
        const day = typeof sessionDate === 'string' ? sessionDate.slice(0, 10) : '';
        return day === selectedIsoDate;
      })
      .sort((a, b) => {
        const aTime = new Date(a.startedAt || a.endedAt).getTime();
        const bTime = new Date(b.startedAt || b.endedAt).getTime();
        return bTime - aTime;
      });
  }, [selectedIsoDate, sessions]);

  function dayRiskTone(dayIsoDate: string): 'none' | 'safe' | 'warning' | 'high' {
    const dayStats = byDay[dayIsoDate];
    if (!dayStats || dayStats.count === 0) {
      return 'none';
    }
    if (dayStats.high > 0) {
      return 'high';
    }
    if (dayStats.warning > 0) {
      return 'warning';
    }
    return 'safe';
  }

  function formatDayHeading(isoDate: string) {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
      return isoDate;
    }
    return parsed.toLocaleDateString(undefined, {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatSessionTime(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '--:--';
    }
    return parsed.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function moveMonth(offset: number) {
    setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="ACL Guardian"
        actionIcon="add"
        actionLabel="New Session"
        onActionPress={() => router.push('/session/select')}
      />
      <View style={styles.content}>
        <View style={styles.monthHeaderRow}>
          <Pressable style={styles.monthSwitchButton} onPress={() => moveMonth(-1)}>
            <Ionicons name="chevron-back" size={18} color={ACLTheme.colors.primary} />
          </Pressable>
          <View style={styles.monthCenter}>
            <Text style={styles.monthTitle}>
              {displayMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Text>
            <Text style={styles.monthMeta}>{monthlyCount} completed sessions</Text>
          </View>
          <Pressable style={styles.monthSwitchButton} onPress={() => moveMonth(1)}>
            <Ionicons name="chevron-forward" size={18} color={ACLTheme.colors.primary} />
          </Pressable>
        </View>

        <View style={styles.calendarPanel}>
          <View style={styles.weekHeaderRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} style={styles.weekHeaderText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((day) => {
              const dayStats = byDay[day.isoDate];
              const riskTone = dayRiskTone(day.isoDate);
              const isSelected = day.isoDate === selectedIsoDate;

              return (
                <Pressable
                  key={day.isoDate}
                  onPress={() => setSelectedIsoDate(day.isoDate)}
                  style={[
                    styles.dayCell,
                    !day.inCurrentMonth && styles.dayCellOutside,
                    riskTone === 'safe' && styles.dayCellSafe,
                    riskTone === 'warning' && styles.dayCellWarning,
                    riskTone === 'high' && styles.dayCellHighRisk,
                    isSelected && styles.dayCellSelected,
                  ]}>
                  <Text style={[styles.dayNumber, !day.inCurrentMonth && styles.dayNumberOutside]}>
                    {day.date.getDate()}
                  </Text>
                  {dayStats ? (
                    <Text style={styles.dayStats}>
                      {dayStats.count}x {riskTone === 'high' ? 'high' : riskTone === 'warning' ? 'warning' : 'safe'}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.selectedDayCard}>
          <Text style={styles.selectedDayTitle}>{formatDayHeading(selectedIsoDate)}</Text>
          <Text style={styles.selectedDayMeta}>
            {selectedSessions.length} session{selectedSessions.length === 1 ? '' : 's'}
          </Text>
          {selectedSessions.length === 0 ? (
            <Text style={styles.emptyDayText}>No sessions for this day. Start one from New Session.</Text>
          ) : (
            <ScrollView
              style={styles.daySessionList}
              contentContainerStyle={styles.daySessionListContent}
              showsVerticalScrollIndicator={false}>
              {selectedSessions.map((item) => (
                <View key={item.id} style={styles.daySessionRow}>
                  <View style={styles.daySessionMain}>
                    <Text style={styles.daySessionExercise}>{item.exerciseName}</Text>
                    <Text style={styles.daySessionTime}>{formatSessionTime(item.startedAt || item.endedAt)}</Text>
                  </View>
                  <View
                    style={[
                      styles.sessionRiskPill,
                      item.peakRiskLevel === 'high'
                        ? styles.sessionRiskHigh
                        : item.peakRiskLevel === 'warning'
                          ? styles.sessionRiskWarning
                          : styles.sessionRiskSafe,
                    ]}>
                    <Text style={styles.sessionRiskText}>{item.peakRiskLevel}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
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
    flex: 1,
    padding: ACLTheme.spacing.lg,
    gap: ACLTheme.spacing.md,
  },
  calendarPanel: {
    flex: 1,
    gap: ACLTheme.spacing.sm,
    minHeight: 280,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ACLTheme.spacing.sm,
  },
  monthSwitchButton: {
    width: 36,
    height: 36,
    borderRadius: ACLTheme.radius.md,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: ACLTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  monthTitle: {
    color: ACLTheme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: ACLTheme.fonts.title,
  },
  monthMeta: {
    color: ACLTheme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: ACLTheme.fonts.body,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekHeaderText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: ACLTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: ACLTheme.fonts.body,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: ACLTheme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: ACLTheme.colors.surface,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: '20%',
    padding: ACLTheme.spacing.xs,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: ACLTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellOutside: {
    backgroundColor: '#131927',
  },
  dayCellSafe: {
    backgroundColor: '#10251e',
  },
  dayCellWarning: {
    backgroundColor: '#15343b',
  },
  dayCellHighRisk: {
    backgroundColor: '#2a294a',
  },
  dayCellSelected: {
    borderColor: ACLTheme.colors.primary,
    borderWidth: 1.5,
  },
  dayNumber: {
    width: '100%',
    textAlign: 'center',
    color: ACLTheme.colors.text,
    fontWeight: '700',
    fontSize: 13,
    fontFamily: ACLTheme.fonts.body,
  },
  dayNumberOutside: {
    color: ACLTheme.colors.textMuted,
  },
  dayStats: {
    marginTop: ACLTheme.spacing.xs,
    fontSize: 10,
    textAlign: 'center',
    color: ACLTheme.colors.textMuted,
    fontFamily: ACLTheme.fonts.body,
  },
  selectedDayCard: {
    maxHeight: 240,
    minHeight: 140,
    borderRadius: ACLTheme.radius.lg,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: ACLTheme.colors.surface,
    padding: ACLTheme.spacing.lg,
    gap: ACLTheme.spacing.sm,
  },
  selectedDayTitle: {
    color: ACLTheme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: ACLTheme.fonts.title,
  },
  selectedDayMeta: {
    color: ACLTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: ACLTheme.fonts.body,
  },
  emptyDayText: {
    color: ACLTheme.colors.textMuted,
    fontSize: 13,
    fontFamily: ACLTheme.fonts.body,
  },
  daySessionList: {
    flex: 1,
    minHeight: 56,
  },
  daySessionListContent: {
    gap: ACLTheme.spacing.xs,
    paddingBottom: 2,
  },
  daySessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: ACLTheme.radius.md,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: ACLTheme.colors.surfaceMuted,
    paddingHorizontal: ACLTheme.spacing.sm,
    paddingVertical: ACLTheme.spacing.sm,
    gap: ACLTheme.spacing.sm,
  },
  daySessionMain: {
    flex: 1,
  },
  daySessionExercise: {
    color: ACLTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: ACLTheme.fonts.body,
  },
  daySessionTime: {
    color: ACLTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: ACLTheme.fonts.body,
  },
  sessionRiskPill: {
    borderRadius: ACLTheme.radius.sm,
    paddingHorizontal: ACLTheme.spacing.sm,
    paddingVertical: 4,
  },
  sessionRiskSafe: {
    backgroundColor: '#133a2f',
  },
  sessionRiskWarning: {
    backgroundColor: '#19414a',
  },
  sessionRiskHigh: {
    backgroundColor: '#2e315a',
  },
  sessionRiskText: {
    color: ACLTheme.colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: ACLTheme.fonts.body,
  },
});
