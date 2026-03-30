import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ACLTheme } from '@/constants/acl-theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACLTheme.colors.primary,
        tabBarInactiveTintColor: ACLTheme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: ACLTheme.colors.tabBar,
          borderTopColor: ACLTheme.colors.border,
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color, size }) => <Ionicons name="analytics-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
