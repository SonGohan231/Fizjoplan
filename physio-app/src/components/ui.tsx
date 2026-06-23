import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { theme } from '../theme';
import { pl } from '../i18n/pl';

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
}) {
  const isDisabled = disabled || loading;
  const bg =
    variant === 'primary' ? theme.colors.primary : variant === 'danger' ? theme.colors.dangerBg : 'transparent';
  const fg =
    variant === 'primary' ? '#fff' : variant === 'danger' ? theme.colors.danger : theme.colors.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : 1 },
        variant !== 'primary' && { borderWidth: 1, borderColor: variant === 'danger' ? theme.colors.danger : theme.colors.primary },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function Badge({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'danger' }) {
  return (
    <View style={[styles.badge, tone === 'danger' && { backgroundColor: theme.colors.dangerBg }]}>
      <Text style={[styles.badgeText, tone === 'danger' && { color: theme.colors.danger }]}>{children}</Text>
    </View>
  );
}

/** Persistent test-build banner: flags that content is educational, unverified,
 *  and not a medical diagnosis. Shown on entry and on generated plans. */
export function TestVersionBanner() {
  return (
    <View style={styles.testBanner}>
      <Text style={styles.testBannerTitle}>{pl.testBanner.version}</Text>
      <Text style={styles.testBannerLine}>
        {pl.testBanner.educational} · {pl.testBanner.physioReview}
      </Text>
      <Text style={styles.testBannerLine}>{pl.testBanner.notDiagnosis}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  btnText: { fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  section: {
    fontSize: theme.font.h2,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 8,
  },
  bulletRow: { flexDirection: 'row', marginVertical: 3 },
  bulletDot: { color: theme.colors.primary, marginRight: 8, fontSize: 16, lineHeight: 20 },
  bulletText: { flex: 1, color: theme.colors.text, fontSize: theme.font.body, lineHeight: 20 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.font.small },
  testBanner: {
    backgroundColor: theme.colors.dangerBg,
    borderColor: '#ffd8a8',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 6,
  },
  testBannerTitle: {
    color: theme.colors.danger,
    fontWeight: '800',
    fontSize: theme.font.small,
    letterSpacing: 0.5,
  },
  testBannerLine: { color: theme.colors.danger, fontSize: theme.font.small, lineHeight: 18 },
});
