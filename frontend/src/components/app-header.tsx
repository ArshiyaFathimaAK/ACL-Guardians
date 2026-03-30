import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ACLTheme } from '@/constants/acl-theme';

type AppHeaderProps = {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  onActionPress?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
};

export function AppHeader({
  title = 'ACL Guardian',
  showBack,
  onBackPress,
  onActionPress,
  actionIcon,
  actionLabel,
}: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftCluster}>
        {showBack ? (
          <Pressable
            onPress={onBackPress}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={18} color="#ffffff" />
          </Pressable>
        ) : null}
        <View style={styles.logo}>
          <Ionicons name="shield-checkmark" size={24} color={ACLTheme.colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      {onActionPress && (actionIcon || actionLabel) ? (
        <Pressable
          onPress={onActionPress}
          style={({ pressed }) => [styles.action, actionLabel && styles.actionWithLabel, pressed && styles.pressed]}>
          {actionIcon ? <Ionicons name={actionIcon} size={18} color={ACLTheme.colors.primary} /> : null}
          {actionLabel ? <Text style={styles.actionLabel}>{actionLabel}</Text> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ACLTheme.spacing.lg,
    paddingTop: ACLTheme.spacing.sm,
    paddingBottom: ACLTheme.spacing.md,
    backgroundColor: ACLTheme.colors.background,
  },
  leftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ACLTheme.spacing.sm,
    flexShrink: 1,
  },
  logo: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: ACLTheme.colors.text,
    letterSpacing: 0.2,
    fontFamily: ACLTheme.fonts.title,
    flexShrink: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: ACLTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  action: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: ACLTheme.colors.surface,
    borderWidth: 1,
    borderColor: ACLTheme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  actionWithLabel: {
    width: 'auto',
    minHeight: 36,
    paddingHorizontal: ACLTheme.spacing.sm,
  },
  actionLabel: {
    color: ACLTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: ACLTheme.fonts.body,
  },
  pressed: {
    opacity: 0.8,
  },
});
