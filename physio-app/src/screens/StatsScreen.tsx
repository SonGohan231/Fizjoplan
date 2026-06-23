import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Card, SectionTitle } from '../components/ui';
import { theme } from '../theme';
import { pl } from '../i18n/pl';
import { countByRegion, totalCount, invalidateCache } from '../services/exerciseRepository';
import { getAllExercises } from '../services/exerciseService';
import { computeQuality, QualityStatus } from '../engine/quality';

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>;

export default function StatsScreen(_: Props) {
  const [total, setTotal] = useState(0);
  const [regions, setRegions] = useState<{ region: string; count: number }[]>([]);
  const [quality, setQuality] = useState<Record<QualityStatus, number>>({ excellent: 0, good: 0, needs_review: 0 });

  const load = useCallback(() => {
    invalidateCache();
    totalCount().then(setTotal);
    countByRegion().then(setRegions);
    getAllExercises().then((all) => {
      const q: Record<QualityStatus, number> = { excellent: 0, good: 0, needs_review: 0 };
      all.forEach((e) => { q[computeQuality(e).status] += 1; });
      setQuality(q);
    });
  }, []);

  useFocusEffect(load);

  const maxCount = Math.max(1, ...regions.map((r) => r.count));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.totalCard}>
        <Text style={styles.totalNum}>{total}</Text>
        <Text style={styles.totalLabel}>{pl.stats.total}</Text>
      </Card>

      <SectionTitle>{pl.stats.byRegion}</SectionTitle>
      {regions.map((r) => (
        <View key={r.region} style={styles.barRow}>
          <Text style={styles.barLabel}>{r.region}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${(r.count / maxCount) * 100}%` }]} />
          </View>
          <Text style={styles.barCount}>{r.count}</Text>
        </View>
      ))}

      <SectionTitle>{pl.stats.quality}</SectionTitle>
      <View style={styles.qualityRow}>
        <QualityPill label={pl.stats.excellent} count={quality.excellent} color={theme.colors.success} />
        <QualityPill label={pl.stats.good} count={quality.good} color={theme.colors.primary} />
        <QualityPill label={pl.stats.needsReview} count={quality.needs_review} color={theme.colors.danger} />
      </View>
    </ScrollView>
  );
}

function QualityPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillCount, { color }]}>{count}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  totalCard: { alignItems: 'center', paddingVertical: 24, backgroundColor: theme.colors.accent, borderColor: '#cfe8ef' },
  totalNum: { fontSize: 44, fontWeight: '800', color: theme.colors.primary },
  totalLabel: { color: theme.colors.textMuted, fontSize: theme.font.body },
  barRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  barLabel: { width: 96, fontSize: theme.font.small, color: theme.colors.text },
  barTrack: { flex: 1, height: 16, backgroundColor: theme.colors.accent, borderRadius: 8, overflow: 'hidden' },
  barFill: { height: 16, backgroundColor: theme.colors.primary, borderRadius: 8 },
  barCount: { width: 32, textAlign: 'right', fontSize: theme.font.small, color: theme.colors.textMuted },
  qualityRow: { flexDirection: 'row', gap: 10 },
  pill: { flex: 1, borderWidth: 2, borderRadius: theme.radius.md, alignItems: 'center', paddingVertical: 14 },
  pillCount: { fontSize: 24, fontWeight: '800' },
  pillLabel: { fontSize: theme.font.small, color: theme.colors.textMuted, marginTop: 2 },
});
