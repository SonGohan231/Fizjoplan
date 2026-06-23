import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Exercise } from '../types';
import { Card, Badge, SectionTitle } from '../components/ui';
import { theme } from '../theme';
import { pl } from '../i18n/pl';
import { getExerciseById } from '../services/exerciseService';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseDetail'>;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ExerciseDetailScreen({ route, navigation }: Props) {
  const { exerciseId } = route.params;
  const [ex, setEx] = useState<Exercise | null>(null);

  useEffect(() => {
    getExerciseById(exerciseId).then(setEx);
  }, [exerciseId]);

  useEffect(() => {
    if (ex) navigation.setOptions({ title: ex.title_pl });
  }, [ex, navigation]);

  if (!ex) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const dur = ex.duration_seconds ? `${ex.duration_seconds} ${pl.common.seconds}` : pl.common.none;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{ex.title_pl}</Text>
      {ex.title_en ? <Text style={styles.subtitle}>{ex.title_en}</Text> : null}

      <View style={styles.badges}>
        {ex.goal_tags.map((g) => (
          <View key={g} style={{ marginRight: 6, marginBottom: 6 }}>
            <Badge>{g}</Badge>
          </View>
        ))}
      </View>

      <SectionTitle>{pl.detail.description}</SectionTitle>
      <Text style={styles.body}>{ex.description_pl}</Text>

      <SectionTitle>{pl.detail.dose}</SectionTitle>
      <Card>
        <Row label={pl.detail.sets} value={ex.sets != null ? String(ex.sets) : pl.common.none} />
        <Row label={pl.detail.reps} value={ex.reps != null ? String(ex.reps) : pl.common.none} />
        <Row label={pl.detail.duration} value={dur} />
        <Row
          label={pl.detail.frequency}
          value={ex.frequency_per_week != null ? `${ex.frequency_per_week}${pl.common.perWeek}` : pl.common.none}
        />
        <Row label={pl.detail.position} value={ex.position ?? pl.common.none} />
        <Row label={pl.detail.equipment} value={ex.equipment.length ? ex.equipment.join(', ') : pl.common.none} />
      </Card>

      {ex.progression ? (
        <>
          <SectionTitle>{pl.detail.progression}</SectionTitle>
          <Text style={styles.body}>{ex.progression}</Text>
        </>
      ) : null}

      {ex.regression ? (
        <>
          <SectionTitle>{pl.detail.regression}</SectionTitle>
          <Text style={styles.body}>{ex.regression}</Text>
        </>
      ) : null}

      {ex.contraindications.length ? (
        <Card style={styles.alert}>
          <Text style={styles.alertTitle}>{pl.detail.contraindications}</Text>
          <Text style={styles.alertText}>{ex.contraindications.join(', ')}</Text>
        </Card>
      ) : null}

      {ex.source_url ? (
        <Text style={styles.source}>
          {pl.detail.source}: {ex.source_url}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  subtitle: { color: theme.colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  body: { color: theme.colors.text, fontSize: theme.font.body, lineHeight: 21 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { color: theme.colors.textMuted, fontSize: theme.font.small },
  rowValue: { color: theme.colors.text, fontWeight: '600', fontSize: theme.font.small },
  alert: { backgroundColor: theme.colors.dangerBg, borderColor: '#ffd8a8', marginTop: 16 },
  alertTitle: { color: theme.colors.danger, fontWeight: '700', marginBottom: 4 },
  alertText: { color: theme.colors.danger, fontSize: theme.font.small },
  source: { color: theme.colors.textMuted, fontSize: 11, marginTop: 18 },
});
