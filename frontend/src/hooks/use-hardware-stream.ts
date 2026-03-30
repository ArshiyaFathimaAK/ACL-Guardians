import { useEffect, useMemo, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

const REQUEST_TIMEOUT_MS = 1200;

function normalizeBaseUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
}

const ENV_BASE = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

function hostFromHostUri(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.split(':')[0] || null;
}

function getMetroHost() {
  const scriptURL = (NativeModules.SourceCode as { scriptURL?: string } | undefined)?.scriptURL;
  if (!scriptURL) {
    return null;
  }

  try {
    return new URL(scriptURL).hostname || null;
  } catch {
    return null;
  }
}

function getFallbackBaseUrl() {
  const hostCandidates = [
    hostFromHostUri(Constants.expoConfig?.hostUri),
    hostFromHostUri(
      (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost
    ),
    getMetroHost(),
  ].filter(Boolean) as string[];

  const host = hostCandidates[0] ?? null;
  return host ? `http://${host}:8000` : null;
}

const BASE_URLS = Array.from(
  new Set([
    getFallbackBaseUrl(),
    ENV_BASE,
    // Keep localhost as final fallback for simulator/emulator only.
    'http://127.0.0.1:8000',
  ].filter(Boolean))
) as string[];

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

type ApiResponse = {
  status: string;
  state?: string;
  thresholds?: {
    goodY2Max?: number;
    badY2Min?: number;
  };
  knee?: {
    x1?: number;
    y1?: number;
    z1?: number;
    x2?: number;
    y2?: number;
    z2?: number;
    diff?: number;
  };
  accelerometer?: {
    x: number;
    y: number;
    z: number;
    magnitude: number;
  };
  angles?: {
    pitch: number;
    roll: number;
    tilt: number | null;
  };
};

export type HardwareSnapshot = {
  connected: boolean;
  sampleTimeMs: number;
  angle: number;
  z: number;
  roll: number;
  pitch: number;
  magnitude: number;
  frequencyHz: number;
  aligned: boolean;
  motionState: 'rest' | 'good' | 'bad' | 'warning' | 'transient' | 'unknown';
  kneeY2: number;
  kneeDiff: number;
  goodY2Max: number;
  badY2Min: number;
  sourceUrl: string;
};

const initialSnapshot: HardwareSnapshot = {
  connected: false,
  sampleTimeMs: 0,
  angle: 0,
  z: 0,
  roll: 0,
  pitch: 0,
  magnitude: 0,
  frequencyHz: 0,
  aligned: false,
  motionState: 'unknown',
  kneeY2: 0,
  kneeDiff: 0,
  goodY2Max: 5.0,
  badY2Min: 7.0,
  sourceUrl: BASE_URLS[0] ?? '',
};

export function useHardwareStream(pollMs = 700) {
  const [snapshot, setSnapshot] = useState<HardwareSnapshot>(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<{ angle: number; time: number } | null>(null);

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      let lastError: unknown = null;

      for (const baseUrl of BASE_URLS) {
        try {
          const response = await fetchWithTimeout(`${baseUrl}/api/accelerometer/latest`, REQUEST_TIMEOUT_MS);
          if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
          }

          const data = (await response.json()) as ApiResponse;
          const pitch = data.angles?.pitch ?? 0;
          const roll = data.angles?.roll ?? 0;
          const z = data.accelerometer?.z ?? 0;
          const incomingState = data.state;
          const motionState =
            incomingState === 'rest' ||
            incomingState === 'good' ||
            incomingState === 'bad' ||
            incomingState === 'warning' ||
            incomingState === 'transient'
              ? incomingState
              : 'unknown';
          const angle = Math.abs(pitch);
          const magnitude = data.accelerometer?.magnitude ?? 0;
          const kneeY2 = data.knee?.y2 ?? 0;
          const kneeDiff = data.knee?.diff ?? 0;
          const goodY2Max = data.thresholds?.goodY2Max ?? 5.0;
          const badY2Min = data.thresholds?.badY2Min ?? 7.0;
          const now = Date.now();

          let frequencyHz = 0;
          if (last.current) {
            const dt = Math.max(0.001, (now - last.current.time) / 1000);
            const da = Math.abs(angle - last.current.angle);
            frequencyHz = Math.min(2.5, da / (dt * 120));
          }

          last.current = { angle, time: now };

          // Dual-sensor calibration readiness for 90-degree setup.
          // We trust firmware state + knee metric availability instead of single-sensor pose checks.
          const hasKneeMetric = Number.isFinite(kneeY2);
          const aligned =
            data.status === 'ok' &&
            motionState !== 'unknown' &&
            motionState !== 'bad' &&
            hasKneeMetric;

          if (!mounted) {
            return;
          }

          setSnapshot({
            connected: data.status === 'ok',
            sampleTimeMs: now,
            angle,
            z,
            roll,
            pitch,
            magnitude,
            frequencyHz,
            aligned,
            motionState,
            kneeY2,
            kneeDiff,
            goodY2Max,
            badY2Min,
            sourceUrl: baseUrl,
          });
          setError(null);
          return;
        } catch (err) {
          lastError = err;
        }
      }

      if (!mounted) {
        return;
      }

      setError(lastError instanceof Error ? lastError.message : 'Hardware fetch failed');
      setSnapshot((prev) => ({ ...prev, connected: false, aligned: false, sampleTimeMs: Date.now() }));
    };

    poll();
    const interval = setInterval(poll, pollMs);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pollMs]);

  return useMemo(
    () => ({ snapshot, error }),
    [snapshot, error]
  );
}
