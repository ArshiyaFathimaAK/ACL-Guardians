export type RiskLevel = 'safe' | 'warning' | 'high';

export type ExerciseDefinition = {
  id: string;
  name: string;
  category: string;
  description: string;
  targetAngleMin: number;
  targetAngleMax: number;
  targetFrequencyHz: number;
  riskAngleAbove: number;
  riskFrequencyAbove: number;
  focusCue: string;
};

export type SessionSummary = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  riskPoints: number;
  highRiskMoments: number;
  injuryIndication: boolean;
  peakRiskLevel: RiskLevel;
  trend: number[];
};

export type PlannedExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  date: string;
  createdAt: string;
};

const exercisesSeed = require('@/data/exercises.json') as ExerciseDefinition[];
const sessionsSeed = [
  {
    id: 'session-1',
    exerciseId: 'squat',
    exerciseName: 'Controlled Squat',
    startedAt: '2026-03-27T09:30:00.000Z',
    endedAt: '2026-03-27T09:36:00.000Z',
    durationSec: 360,
    riskPoints: 3,
    highRiskMoments: 1,
    injuryIndication: false,
    peakRiskLevel: 'warning',
    trend: [15, 22, 28, 18, 35, 42, 30, 24, 16, 12],
  },
] as SessionSummary[];

let sessionsJsonStore = JSON.stringify(sessionsSeed);
let plannedJsonStore = JSON.stringify([] as PlannedExercise[]);

export function getExercisesFromJson(): ExerciseDefinition[] {
  return exercisesSeed;
}

export function getSessionsFromJson(): SessionSummary[] {
  return JSON.parse(sessionsJsonStore) as SessionSummary[];
}

export function addSessionToJson(next: SessionSummary): SessionSummary[] {
  const existing = getSessionsFromJson();
  const updated = [next, ...existing];
  sessionsJsonStore = JSON.stringify(updated);
  return updated;
}

export function getPlannedExercisesFromJson(): PlannedExercise[] {
  return JSON.parse(plannedJsonStore) as PlannedExercise[];
}

export function addPlannedExerciseToJson(next: PlannedExercise): PlannedExercise[] {
  const existing = getPlannedExercisesFromJson();
  const updated = [next, ...existing];
  plannedJsonStore = JSON.stringify(updated);
  return updated;
}
