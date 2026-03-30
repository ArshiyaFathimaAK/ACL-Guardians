import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  addPlannedExerciseToJson,
  addSessionToJson,
  getExercisesFromJson,
  getPlannedExercisesFromJson,
  getSessionsFromJson,
  type ExerciseDefinition,
  type PlannedExercise,
  type RiskLevel,
  type SessionSummary,
} from '@/data/repository';

type CalibrationState = 'idle' | 'positioning' | 'calibrated';

type TrainingContextValue = {
  exercises: ExerciseDefinition[];
  plannedExercises: PlannedExercise[];
  sessions: SessionSummary[];
  selectedExerciseId: string;
  selectedExercise: ExerciseDefinition;
  calibrationState: CalibrationState;
  trackingEnabled: boolean;
  latestFeedback: string;
  liveRiskTrend: number[];
  liveRiskLevel: RiskLevel;
  activeSessionId: string | null;
  selectExercise: (exerciseId: string) => void;
  planExerciseForDay: (exerciseId: string, date: string) => PlannedExercise;
  startPositioning: () => void;
  completeCalibration: () => void;
  resetCalibration: () => void;
  startTracking: () => void;
  stopTracking: () => SessionSummary | null;
  ingestRiskSample: (score: number, level: RiskLevel) => void;
};

type ActiveSession = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  startedAt: string;
  riskPoints: number;
  highRiskMoments: number;
  peakRiskLevel: RiskLevel;
  trend: number[];
};

const exercises = getExercisesFromJson();
const fallbackExercise = exercises[0];

const STORAGE_KEYS = {
  sessions: 'acl.sessions.v1',
  planned: 'acl.planned.v1',
};

const TrainingContext = createContext<TrainingContextValue | null>(null);

function normalizeRiskLevel(value: unknown): RiskLevel {
  if (value === 'high' || value === 'warning' || value === 'safe') {
    return value;
  }

  return 'safe';
}

function normalizeSessionSummary(raw: Partial<SessionSummary>): SessionSummary {
  return {
    id: raw.id ?? `${Date.now()}`,
    exerciseId: raw.exerciseId ?? 'unknown',
    exerciseName: raw.exerciseName ?? 'Session',
    startedAt: raw.startedAt ?? new Date().toISOString(),
    endedAt: raw.endedAt ?? new Date().toISOString(),
    durationSec: typeof raw.durationSec === 'number' ? raw.durationSec : 0,
    riskPoints: typeof raw.riskPoints === 'number' ? raw.riskPoints : 0,
    highRiskMoments: typeof raw.highRiskMoments === 'number' ? raw.highRiskMoments : 0,
    injuryIndication: typeof raw.injuryIndication === 'boolean' ? raw.injuryIndication : false,
    peakRiskLevel: normalizeRiskLevel(raw.peakRiskLevel),
    trend: Array.isArray(raw.trend)
      ? raw.trend
          .map((value) => (typeof value === 'number' ? Math.max(0, Math.min(100, value)) : null))
          .filter((value): value is number => value !== null)
      : [],
  };
}

function evaluateRisk(
  exercise: ExerciseDefinition,
  angle: number,
  frequencyHz: number
): { risk: RiskLevel; feedback: string } {
  if (angle >= exercise.riskAngleAbove || frequencyHz >= exercise.riskFrequencyAbove) {
    return {
      risk: 'high',
      feedback: 'High-risk movement detected. Reduce speed and re-align knee tracking.',
    };
  }

  if (angle > exercise.targetAngleMax || angle < exercise.targetAngleMin) {
    return {
      risk: 'warning',
      feedback: 'Outside target angle. Keep the knee in the guided range.',
    };
  }

  return {
    risk: 'safe',
    feedback: 'Solid movement pattern. Continue with controlled tempo.',
  };
}

export function TrainingProvider({ children }: { children: ReactNode }) {
  const [plannedExercises, setPlannedExercises] = useState<PlannedExercise[]>(() =>
    getPlannedExercisesFromJson()
  );
  const [sessions, setSessions] = useState<SessionSummary[]>(() =>
    getSessionsFromJson().map((session) => normalizeSessionSummary(session))
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState(fallbackExercise.id);
  const [calibrationState, setCalibrationState] = useState<CalibrationState>('idle');
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [latestFeedback, setLatestFeedback] = useState('Select an activity to begin your ACL-safe session.');
  const [liveRiskTrend, setLiveRiskTrend] = useState<number[]>([]);
  const [liveRiskLevel, setLiveRiskLevel] = useState<RiskLevel>('safe');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        const [sessionsRaw, plannedRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.sessions),
          AsyncStorage.getItem(STORAGE_KEYS.planned),
        ]);

        if (!mounted) {
          return;
        }

        if (sessionsRaw) {
          const parsed = JSON.parse(sessionsRaw) as Partial<SessionSummary>[];
          setSessions(Array.isArray(parsed) ? parsed.map((session) => normalizeSessionSummary(session)) : []);
        }

        if (plannedRaw) {
          setPlannedExercises(JSON.parse(plannedRaw) as PlannedExercise[]);
        }
      } catch {
        // Keep in-memory fallback data if storage fails.
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions)).catch(() => {
      // Ignore storage errors to avoid blocking user flow.
    });
  }, [sessions, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEYS.planned, JSON.stringify(plannedExercises)).catch(() => {
      // Ignore storage errors to avoid blocking user flow.
    });
  }, [plannedExercises, hydrated]);

  const selectedExercise = useMemo(
    () => exercises.find((item) => item.id === selectedExerciseId) ?? fallbackExercise,
    [selectedExerciseId]
  );

  function mergePeakLevel(current: RiskLevel, incoming: RiskLevel): RiskLevel {
    if (current === 'high' || incoming === 'high') {
      return 'high';
    }

    if (current === 'warning' || incoming === 'warning') {
      return 'warning';
    }

    return 'safe';
  }

  const value = useMemo<TrainingContextValue>(
    () => ({
      exercises,
      plannedExercises,
      sessions,
      selectedExerciseId,
      selectedExercise,
      calibrationState,
      trackingEnabled,
      latestFeedback,
      liveRiskTrend,
      liveRiskLevel,
      activeSessionId: activeSession?.id ?? null,
      selectExercise: (exerciseId) => {
        setSelectedExerciseId(exerciseId);
        setTrackingEnabled(false);
        setCalibrationState('idle');
        setLiveRiskTrend([]);
        setLiveRiskLevel('safe');
        setActiveSession(null);
        setLatestFeedback('Activity selected. Place the module near the knee and calibrate.');
      },
      planExerciseForDay: (exerciseId, date) => {
        const selected = exercises.find((item) => item.id === exerciseId) ?? fallbackExercise;
        setSelectedExerciseId(selected.id);

        const next: PlannedExercise = {
          id: `${Date.now()}`,
          exerciseId: selected.id,
          exerciseName: selected.name,
          date,
          createdAt: new Date().toISOString(),
        };

        const updated = addPlannedExerciseToJson(next);
        setPlannedExercises(updated);
        setLatestFeedback(`Added ${selected.name} for ${date}. Proceed to calibration.`);
        return next;
      },
      startPositioning: () => {
        setCalibrationState('positioning');
        setLatestFeedback('Keep the knee steady for calibration baseline.');
      },
      completeCalibration: () => {
        setCalibrationState('calibrated');
        setLatestFeedback('Calibration complete. You can now start tracking.');
      },
      resetCalibration: () => {
        setCalibrationState('idle');
        setTrackingEnabled(false);
        setLatestFeedback('Calibration reset. Re-position module and calibrate again.');
      },
      startTracking: () => {
        const startedAt = new Date().toISOString();
        setActiveSession({
          id: `${Date.now()}`,
          exerciseId: selectedExercise.id,
          exerciseName: selectedExercise.name,
          startedAt,
          riskPoints: 0,
          highRiskMoments: 0,
          peakRiskLevel: 'safe',
          trend: [],
        });
        setLiveRiskTrend([]);
        setLiveRiskLevel('safe');
        setTrackingEnabled(true);
        setLatestFeedback('Tracking started. Move with controlled and stable form.');
      },
      stopTracking: () => {
        setTrackingEnabled(false);
        if (!activeSession) {
          setLatestFeedback('Session paused.');
          return null;
        }

        const endedAt = new Date().toISOString();
        const durationSec = Math.max(
          1,
          Math.round((new Date(endedAt).getTime() - new Date(activeSession.startedAt).getTime()) / 1000)
        );

        const summary: SessionSummary = {
          id: activeSession.id,
          exerciseId: activeSession.exerciseId,
          exerciseName: activeSession.exerciseName,
          startedAt: activeSession.startedAt,
          endedAt,
          durationSec,
          riskPoints: activeSession.riskPoints,
          highRiskMoments: activeSession.highRiskMoments,
          injuryIndication: activeSession.highRiskMoments > 2 || activeSession.riskPoints > 8,
          peakRiskLevel: activeSession.peakRiskLevel,
          trend: activeSession.trend,
        };

        const updated = addSessionToJson(summary);
        setSessions(updated);
        setActiveSession(null);
        setLatestFeedback('Session saved. You can review it in Sessions.');
        return summary;
      },
      ingestRiskSample: (score, level) => {
        const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
        setLiveRiskTrend((prev) => [...prev.slice(-79), clampedScore]);
        setLiveRiskLevel(level);

        if (!trackingEnabled) {
          return;
        }

        setActiveSession((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            riskPoints: prev.riskPoints + (level === 'warning' ? 1 : level === 'high' ? 2 : 0),
            highRiskMoments: prev.highRiskMoments + (level === 'high' ? 1 : 0),
            peakRiskLevel: mergePeakLevel(prev.peakRiskLevel, level),
            trend: [...prev.trend.slice(-79), clampedScore],
          };
        });

        if (level === 'high') {
          setLatestFeedback('High risk spike detected. Slow down and re-align your knee tracking.');
        } else if (level === 'warning') {
          setLatestFeedback('Risk increasing. Keep movement controlled and centered.');
        }
      },
    }),
    [
      plannedExercises,
      sessions,
      selectedExerciseId,
      selectedExercise,
      calibrationState,
      trackingEnabled,
      latestFeedback,
      liveRiskTrend,
      liveRiskLevel,
      activeSession,
    ]
  );

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
}

export function useTraining() {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error('useTraining must be used within TrainingProvider');
  }

  return context;
}
