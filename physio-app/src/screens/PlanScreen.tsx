import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Exercise, RehabPlan } from '../types';
import { Card, Badge, Bullet, PrimaryButton, SectionTitle, TestVersionBanner } from '../components/ui';
import { theme } from '../theme';
import { pl } from '../i18n/pl';
import { getAllExercises } from '../services/exerciseService';
import { generatePlan, planIsThin } from '../engine/planGenerator';
import { exportPlanToPdf, exportPatientPlanToPdf } from '../services/pdfExport';

type Props = NativeStackScreenProps<RootStackParamList, 'Plan'>;

const LEVEL_LABEL: Record<string, string> = { easy: pl.level.easy, medium: pl.level.medium, advanced: pl.level.advanced };

export default function PlanScreen({ route, navigation }: Props) {
  const { analysis, level } = route.params;
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getAllExercises().then(setExercises);
  }, []);

  const plan: RehabPlan | null = useMemo(() => {
    if (!exercises) return null;
    return generatePlan({ analysis, level, exercises });
  }, [exercises, analysis, level]);

  async function onExport() {
    if (!plan) return;
    setExporting(true);
    try {
      await exportPlanToPdf(plan);
    } catch (e: any) {
      Alert.alert('PDF', e?.message ?? 'Nie udało się wygenerować PDF.');
    } finally {
      setExporting(false);
    }
  }

  async function onExportPatient() {
    if (!plan) return;
    setExporting(true);
    try {
      await exportPatientPlanToPdf(plan);
    } catch (e: any) {
      Alert.alert('PDF', e?.message ?? 'Nie udało się wygenerować PDF.');
    } finally {
      setExporting(false);
    }
  }

  if (!plan) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={{ marginTop: 8, color: theme.colors.textMuted }}>{pl.common.loading}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TestVersionBanner />
      <Badge>{LEVEL_LABEL[plan.level]}</Badge>
      {plan.isSafetyPlan && <View style={{ marginTop: 6 }}><Badge tone="danger">{pl.plan2.safetyPlan}</Badge></View>}

      <SectionTitle>{pl.plan.summary}</SectionTitle>
      <Text style={styles.body}>{plan.problemSummary_pl}</Text>

      {plan.redFlags.length > 0 && (
        <Card style={styles.alert}>
          <Text style={styles.alertTitle}>⚠️ {pl.plan.redFlags}</Text>
          {plan.redFlags.map((r) => (
            <Text key={r.code} style={styles.alertText}>• {r.message_pl}</Text>
          ))}
        </Card>
      )}

      <SectionTitle>{pl.plan.safety}</SectionTitle>
      {plan.safetyNotes_pl.map((n, i) => (
        <Bullet key={i}>{n}</Bullet>
      ))}

      <SectionTitle>{pl.plan.exercises}</SectionTitle>
      {planIsThin(plan) && <Text style={styles.thin}>{pl.plan.thin}</Text>}
      {plan.exercises.map((pe) => (
        <TouchableOpacity
          key={pe.exercise.id}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: pe.exercise.id })}
        >
          <Card>
            <Text style={styles.exTitle}>{pe.exercise.title_pl}</Text>
            <Text style={styles.dose}>
              {pe.sets} {pe.sets === 1 ? 'seria' : 'serie'}
              {pe.reps ? ` × ${pe.reps} powt.` : ''}
              {pe.duration_seconds ? ` × ${pe.duration_seconds}s` : ''} • {plan.weeklyFrequency_pl}
            </Text>
            <Text style={styles.exDesc} numberOfLines={2}>{pe.exercise.description_pl}</Text>
            <Text style={styles.detailsLink}>{pl.plan.details} ›</Text>
          </Card>
        </TouchableOpacity>
      ))}

      <SectionTitle>{pl.plan.frequency}</SectionTitle>
      <Text style={styles.body}>{plan.weeklyFrequency_pl}</Text>

      <SectionTitle>{pl.plan.progression}</SectionTitle>
      <Text style={styles.body}>{plan.progressionAdvice_pl}</Text>

      <SectionTitle>{pl.plan.stop}</SectionTitle>
      {plan.stopWarningSigns_pl.map((s, i) => (
        <Bullet key={i}>{s}</Bullet>
      ))}

      <Card style={[styles.alert, { marginTop: 18 }]}>
        <Text style={styles.alertText}>{plan.disclaimer_pl}</Text>
      </Card>

      <View style={{ height: 8 }} />
      <PrimaryButton
        label={exporting ? pl.plan.exporting : pl.plan.export}
        onPress={onExport}
        loading={exporting}
      />
      <PrimaryButton
        label={pl.plan2.patientPdf}
        variant="outline"
        onPress={onExportPatient}
        disabled={exporting}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { color: theme.colors.text, fontSize: theme.font.body, lineHeight: 21 },
  exTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  dose: { color: theme.colors.primary, fontWeight: '600', fontSize: theme.font.small, marginVertical: 4 },
  exDesc: { color: theme.colors.textMuted, fontSize: theme.font.small, lineHeight: 19 },
  detailsLink: { color: theme.colors.primary, marginTop: 8, fontWeight: '600', fontSize: theme.font.small },
  thin: { color: theme.colors.danger, marginBottom: 8 },
  alert: { backgroundColor: theme.colors.dangerBg, borderColor: '#ffd8a8' },
  alertTitle: { color: theme.colors.danger, fontWeight: '700', marginBottom: 6 },
  alertText: { color: theme.colors.danger, fontSize: theme.font.small, lineHeight: 19, marginVertical: 2 },
});
