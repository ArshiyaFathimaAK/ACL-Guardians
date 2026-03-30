import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import RiskLineChart from '@/components/risk-line-chart';
import { ACLTheme } from '@/constants/acl-theme';
import { useTraining } from '@/state/training-store';

type DetailTab = 'overview' | 'risk' | 'trend';

export default function SessionsScreen() {
  const { sessions } = useTraining();
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aTime = new Date(a.startedAt || a.endedAt).getTime();
      const bTime = new Date(b.startedAt || b.endedAt).getTime();
      return bTime - aTime;
    });
  }, [sessions]);

  function formatDate(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Date unavailable';
    }

    return parsed.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Sessions"
        actionIcon="add"
        actionLabel="New Session"
        onActionPress={() => router.push('/session/select')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {sortedSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyText}>Your completed sessions and injury indications will appear here.</Text>
          </View>
        ) : (
          sortedSessions.map((session) => {
            const trend = Array.isArray(session.trend) ? session.trend : [];
            const isExpanded = expandedSessionId === session.id;

            return (
              <Pressable
                key={session.id}
                style={styles.card}
                onPress={() => {
                  setExpandedSessionId((prev) => (prev === session.id ? null : session.id));
                  setDetailTab('overview');
                }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.exerciseName}>{session.exerciseName}</Text>
                  <View
                    style={[
                      styles.badge,
                      session.injuryIndication ? styles.badgeHigh : styles.badgeSafe,
                    ]}>
                    <Text style={styles.badgeText}>
                      {session.injuryIndication ? 'Potential injury risk' : 'No major risk'}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowBetween}>
                  <Text style={styles.dateText}>{formatDate(session.startedAt || session.endedAt)}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={ACLTheme.colors.textMuted}
                  />
                </View>

                <View style={styles.tagsRow}>
                  <View style={styles.tagNeutral}>
                    <Ionicons name="time-outline" size={13} color={ACLTheme.colors.text} />
                    <Text style={styles.tagText}>{Math.max(1, Math.round(session.durationSec / 60))} min</Text>
                  </View>
                  <View style={styles.tagWarning}>
                    <Ionicons name="alert-circle-outline" size={13} color={ACLTheme.colors.warning} />
                    <Text style={styles.tagText}>{session.riskPoints} points</Text>
                  </View>
                  <View style={styles.tagHigh}>
                    <Ionicons name="pulse-outline" size={13} color={ACLTheme.colors.high} />
                    <Text style={styles.tagText}>{session.highRiskMoments} spikes</Text>
                  </View>
                  <View style={styles.tagSafe}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={ACLTheme.colors.safe} />
                    <Text style={styles.tagText}>{session.peakRiskLevel}</Text>
                  </View>
                </View>

                {isExpanded ? (
                  <View style={styles.expandedBlock}>
                    <View style={styles.tabRow}>
                      <Pressable
                        style={[styles.tabButton, detailTab === 'overview' && styles.tabButtonActive]}
                        onPress={() => setDetailTab('overview')}>
                        <Text style={[styles.tabText, detailTab === 'overview' && styles.tabTextActive]}>Overview</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.tabButton, detailTab === 'risk' && styles.tabButtonActive]}
                        onPress={() => setDetailTab('risk')}>
                        <Text style={[styles.tabText, detailTab === 'risk' && styles.tabTextActive]}>Risk</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.tabButton, detailTab === 'trend' && styles.tabButtonActive]}
                        onPress={() => setDetailTab('trend')}>
                        <Text style={[styles.tabText, detailTab === 'trend' && styles.tabTextActive]}>Trend</Text>
                      </Pressable>
                    </View>

                    {detailTab === 'overview' ? (
                      <View style={styles.bentoGrid}>
                        <View style={styles.bentoItem}>
                          <Text style={styles.bentoLabel}>Session time</Text>
                          <Text style={styles.bentoValue}>{Math.max(1, Math.round(session.durationSec / 60))} min</Text>
                        </View>
                        <View style={styles.bentoItem}>
                          <Text style={styles.bentoLabel}>Risk points</Text>
                          <Text style={styles.bentoValue}>{session.riskPoints}</Text>
                        </View>
                        <View style={styles.bentoItem}>
                          <Text style={styles.bentoLabel}>High risk spikes</Text>
                          <Text style={styles.bentoValue}>{session.highRiskMoments}</Text>
                        </View>
                        <View style={styles.bentoItem}>
                          <Text style={styles.bentoLabel}>Peak level</Text>
                          <Text style={styles.bentoValue}>{session.peakRiskLevel}</Text>
                        </View>
                      </View>
                    ) : null}

                    {detailTab === 'risk' ? (
                      <View style={styles.bentoGrid}>
                        <View style={styles.bentoWideHigh}>
                          <Text style={styles.bentoLabel}>Injury indication</Text>
                          <Text style={styles.bentoValue}>
                            {session.injuryIndication ? 'Potential injury risk' : 'No major risk'}
                          </Text>
                        </View>
                        <View style={styles.bentoWideWarning}>
                          <Text style={styles.bentoLabel}>Risk density</Text>
                          <Text style={styles.bentoValue}>
                            {session.durationSec > 0
                              ? `${((session.riskPoints / Math.max(1, session.durationSec / 60)) * 1).toFixed(1)} points/min`
                              : '0.0 points/min'}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {detailTab === 'trend' ? (
                      <View style={styles.graphCard}>
                        <Text style={styles.graphTitle}>Session metric graph</Text>
                        <View style={styles.graphFrame}>
                          <RiskLineChart data={trend.length ? trend : [0]} width={300} height={150} />
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
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
  emptyCard: {
    borderRadius: ACLTheme.radius.lg,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: ACLTheme.colors.surface,
    padding: ACLTheme.spacing.lg,
    gap: ACLTheme.spacing.xs,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ACLTheme.colors.text,
    fontFamily: ACLTheme.fonts.title,
  },
  emptyText: {
    fontSize: 14,
    color: ACLTheme.colors.textMuted,
    fontFamily: ACLTheme.fonts.body,
  },
  card: {
    borderRadius: ACLTheme.radius.lg,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: ACLTheme.colors.surface,
    padding: ACLTheme.spacing.lg,
    gap: ACLTheme.spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: ACLTheme.spacing.sm,
  },
  exerciseName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: ACLTheme.colors.text,
    fontFamily: ACLTheme.fonts.title,
  },
  badge: {
    borderRadius: ACLTheme.radius.md,
    paddingHorizontal: ACLTheme.spacing.sm,
    paddingVertical: 5,
  },
  badgeSafe: {
    backgroundColor: '#193126',
  },
  badgeHigh: {
    backgroundColor: '#1f2d4a',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACLTheme.colors.text,
    fontFamily: ACLTheme.fonts.body,
  },
  dateText: {
    fontSize: 13,
    color: ACLTheme.colors.textMuted,
    fontFamily: ACLTheme.fonts.body,
  },
  tagsRow: {
    marginTop: ACLTheme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ACLTheme.spacing.xs,
  },
  tagNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#252c38',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1c3240',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagHigh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1f2d4a',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagSafe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#193126',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: ACLTheme.colors.text,
    textTransform: 'capitalize',
    fontFamily: ACLTheme.fonts.body,
  },
  expandedBlock: {
    marginTop: ACLTheme.spacing.md,
    gap: ACLTheme.spacing.sm,
  },
  tabRow: {
    flexDirection: 'row',
    gap: ACLTheme.spacing.xs,
  },
  tabButton: {
    flex: 1,
    borderRadius: ACLTheme.radius.md,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: '#1d2431',
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#1a2a47',
    borderColor: ACLTheme.colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: ACLTheme.colors.textMuted,
    fontFamily: ACLTheme.fonts.body,
  },
  tabTextActive: {
    color: ACLTheme.colors.primary,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ACLTheme.spacing.sm,
  },
  bentoItem: {
    width: '48%',
    borderRadius: ACLTheme.radius.md,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: '#1d2431',
    padding: ACLTheme.spacing.sm,
    gap: 4,
  },
  bentoWideHigh: {
    width: '100%',
    borderRadius: ACLTheme.radius.md,
    borderWidth: 1,
    borderColor: '#314466',
    backgroundColor: '#1a2437',
    padding: ACLTheme.spacing.sm,
    gap: 4,
  },
  bentoWideWarning: {
    width: '100%',
    borderRadius: ACLTheme.radius.md,
    borderWidth: 1,
    borderColor: '#255060',
    backgroundColor: '#172a33',
    padding: ACLTheme.spacing.sm,
    gap: 4,
  },
  bentoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ACLTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: ACLTheme.fonts.body,
  },
  bentoValue: {
    fontSize: 16,
    fontWeight: '800',
    color: ACLTheme.colors.text,
    fontFamily: ACLTheme.fonts.title,
    textTransform: 'capitalize',
  },
  graphCard: {
    borderRadius: ACLTheme.radius.md,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: '#1d2431',
    padding: ACLTheme.spacing.sm,
    gap: ACLTheme.spacing.sm,
  },
  graphTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: ACLTheme.colors.text,
    fontFamily: ACLTheme.fonts.body,
  },
  graphFrame: {
    minHeight: 130,
    borderRadius: ACLTheme.radius.sm,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    backgroundColor: '#131a27',
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
