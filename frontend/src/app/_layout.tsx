import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { TrainingProvider } from '@/state/training-store';

export default function RootLayout() {
  return (
    <TrainingProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </TrainingProvider>
  );
}
