import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { BodyRegion, ExerciseInput } from '../../types';
import { PrimaryButton } from '../../components/ui';
import { theme } from '../../theme';
import { pl } from '../../i18n/pl';
import { getExerciseById, upsertExercise } from '../../services/exerciseService';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminEdit'>;

const REGIONS: BodyRegion[] = [
  'neck', 'shoulder', 'elbow', 'wrist_hand', 'thoracic',
  'lower_back', 'hip', 'knee', 'ankle_foot', 'general',
];

const csv = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);
const join = (a: string[] | undefined): string => (a ?? []).join(', ');
const numOrNull = (s: string): number | null => (s.trim() === '' ? null : Number(s));

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export default function AdminEditScreen({ route, navigation }: Props) {
  const editingId = route.params?.exerciseId;
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<ExerciseInput>({
    title_pl: '',
    title_en: '',
    description_pl: '',
    description_en: '',
    body_region: 'general',
    condition_tags: [],
    tissue_tags: [],
    goal_tags: [],
    difficulty_level: 1,
    equipment: [],
    position: '',
    contraindications: [],
    red_flags: [],
    sets: null,
    reps: null,
    duration_seconds: null,
    frequency_per_week: null,
    progression: '',
    regression: '',
    image_url: '',
    video_url: '',
    source_url: '',
    license_note: '',
  });

  useEffect(() => {
    if (editingId) {
      getExerciseById(editingId).then((ex) => {
        if (ex) setForm(ex);
      });
    }
  }, [editingId]);

  function set<K extends keyof ExerciseInput>(key: K, value: ExerciseInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave() {
    if (!form.title_pl.trim() || !form.description_pl.trim()) {
      Alert.alert('Błąd', 'Tytuł i opis (PL) są wymagane.');
      return;
    }
    setBusy(true);
    try {
      await upsertExercise(form);
      Alert.alert('OK', pl.admin.saved);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Błąd', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Field label="Tytuł (PL) *">
        <TextInput style={styles.input} value={form.title_pl} onChangeText={(v) => set('title_pl', v)} />
      </Field>
      <Field label="Tytuł (EN)">
        <TextInput style={styles.input} value={form.title_en ?? ''} onChangeText={(v) => set('title_en', v)} />
      </Field>
      <Field label="Opis (PL) *">
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          value={form.description_pl}
          onChangeText={(v) => set('description_pl', v)}
        />
      </Field>

      <Field label="Region ciała">
        <View style={styles.chipsRow}>
          {REGIONS.map((r) => (
            <Text
              key={r}
              onPress={() => set('body_region', r)}
              style={[styles.regionChip, form.body_region === r && styles.regionChipActive]}
            >
              {r}
            </Text>
          ))}
        </View>
      </Field>

      <Field label="Poziom trudności (1–3)">
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={String(form.difficulty_level)}
          onChangeText={(v) => set('difficulty_level', Math.min(3, Math.max(1, Number(v) || 1)))}
        />
      </Field>

      <Field label="condition_tags (po przecinku)">
        <TextInput style={styles.input} value={join(form.condition_tags)} onChangeText={(v) => set('condition_tags', csv(v))} />
      </Field>
      <Field label="goal_tags (po przecinku)">
        <TextInput style={styles.input} value={join(form.goal_tags)} onChangeText={(v) => set('goal_tags', csv(v))} />
      </Field>
      <Field label="tissue_tags (po przecinku)">
        <TextInput style={styles.input} value={join(form.tissue_tags)} onChangeText={(v) => set('tissue_tags', csv(v))} />
      </Field>
      <Field label="equipment (po przecinku)">
        <TextInput style={styles.input} value={join(form.equipment)} onChangeText={(v) => set('equipment', csv(v))} />
      </Field>
      <Field label="contraindications (po przecinku)">
        <TextInput style={styles.input} value={join(form.contraindications)} onChangeText={(v) => set('contraindications', csv(v))} />
      </Field>
      <Field label="red_flags (po przecinku)">
        <TextInput style={styles.input} value={join(form.red_flags)} onChangeText={(v) => set('red_flags', csv(v))} />
      </Field>

      <View style={styles.rowGroup}>
        <View style={styles.half}>
          <Field label="Serie">
            <TextInput style={styles.input} keyboardType="number-pad" value={form.sets?.toString() ?? ''} onChangeText={(v) => set('sets', numOrNull(v))} />
          </Field>
        </View>
        <View style={styles.half}>
          <Field label="Powtórzenia">
            <TextInput style={styles.input} keyboardType="number-pad" value={form.reps?.toString() ?? ''} onChangeText={(v) => set('reps', numOrNull(v))} />
          </Field>
        </View>
      </View>
      <View style={styles.rowGroup}>
        <View style={styles.half}>
          <Field label="Czas (s)">
            <TextInput style={styles.input} keyboardType="number-pad" value={form.duration_seconds?.toString() ?? ''} onChangeText={(v) => set('duration_seconds', numOrNull(v))} />
          </Field>
        </View>
        <View style={styles.half}>
          <Field label="Częst./tydz.">
            <TextInput style={styles.input} keyboardType="number-pad" value={form.frequency_per_week?.toString() ?? ''} onChangeText={(v) => set('frequency_per_week', numOrNull(v))} />
          </Field>
        </View>
      </View>

      <Field label="Pozycja">
        <TextInput style={styles.input} value={form.position ?? ''} onChangeText={(v) => set('position', v)} />
      </Field>
      <Field label="Progresja">
        <TextInput style={[styles.input, styles.multiline]} multiline value={form.progression ?? ''} onChangeText={(v) => set('progression', v)} />
      </Field>
      <Field label="Regresja">
        <TextInput style={[styles.input, styles.multiline]} multiline value={form.regression ?? ''} onChangeText={(v) => set('regression', v)} />
      </Field>
      <Field label="source_url">
        <TextInput style={styles.input} autoCapitalize="none" value={form.source_url ?? ''} onChangeText={(v) => set('source_url', v)} />
      </Field>
      <Field label="license_note">
        <TextInput style={styles.input} value={form.license_note ?? ''} onChangeText={(v) => set('license_note', v)} />
      </Field>

      <PrimaryButton label={pl.admin.save} onPress={onSave} loading={busy} />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { color: theme.colors.textMuted, fontWeight: '600', marginBottom: 5, fontSize: theme.font.small },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    fontSize: theme.font.body,
    color: theme.colors.text,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  regionChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textMuted,
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 12,
    overflow: 'hidden',
  },
  regionChipActive: { backgroundColor: theme.colors.primary, color: '#fff', borderColor: theme.colors.primary },
  rowGroup: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});
