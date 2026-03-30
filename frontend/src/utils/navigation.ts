import { router } from 'expo-router';

export function safeGoBack(fallback = '/(tabs)') {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback as never);
}
