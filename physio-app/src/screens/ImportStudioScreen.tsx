import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { ExerciseInput } from '../types';
import { Card, PrimaryButton, SectionTitle, Badge } from '../components/ui';
import { theme } from '../theme';
import { pl } from '../i18n/pl';
import {
  parseSingle, buildReport, ValidationReport, batchAutoTag, batchTranslate, applyMerges,
} from '../services/importStudio';
import { addRuntimeExercises } from '../services/exerciseService';
import { invalidateCache } from '../services/exerciseRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'ImportStudio'>;

export default function ImportStudioScreen(_: Props) {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [text, setText] = useState('');
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [working, setWorking] = useState<ExerciseInput[]>([]);
  const [note, setNote] = useState<string | null>(null);

  function validate() {
    const parsed = parseSingle(text, format);
    const rep = buildReport(parsed);
    setReport(rep);
    setWorking(rep.valid);
    setNote(null);
  }

  function doAutoTag() {
    const tagged = batchAutoTag(working);
    setWorking(tagged);
    setNote('Uzupełniono brakujące tagi (auto-tagowanie).');
  }
  function doTranslate() {
    const res = batchTranslate(working as any);
    setWorking(res.records);
    setNote(`Przetłumaczono. Średnia jakość: ${Math.round(res.meanQuality * 100)}% • do przeglądu: ${res.needsReview}.`);
  }
  function doMerge() {
    if (!report) return;
    const merged = applyMerges(working, report.duplicates);
    setWorking(merged);
    setNote(`Scalono duplikaty. Pozostało ${merged.length} rekordów.`);
  }
  function doImport() {
    if (working.length === 0) return;
    const n = addRuntimeExercises(working);
    invalidateCache();
    Alert.alert(pl.studio.imported, `${n} ćwiczeń dostępnych w bibliotece.`);
    setNote(`${pl.studio.imported}: ${n}.`);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>{pl.studio.subtitle}</Text>

      <View style={styles.toggle}>
        {(['json', 'csv'] as const).map((f) => (
          <Pressable key={f} onPress={() => setFormat(f)} style={[styles.toggleBtn, format === f && styles.toggleActive]}>
            <Text style={[styles.toggleText, format === f && styles.toggleTextActive]}>{f.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={pl.studio.placeholder}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        style={styles.input}
      />
      <Text style={styles.zip}>{pl.studio.zipNote}</Text>
      <PrimaryButton label={pl.studio.validate} onPress={validate} />

      {report && (
        <>
          <SectionTitle>{pl.studio.report}</SectionTitle>
          <View style={styles.summaryRow}>
            <Stat label={pl.studio.valid} value={working.length} color={theme.colors.success} />
            <Stat label={pl.studio.invalid} value={report.invalid.length} color={theme.colors.danger} />
            <Stat label={pl.studio.duplicates} value={report.duplicates.length} color={theme.colors.primary} />
            <Stat label={pl.studio.suspicious} value={report.suspicious.length} color={theme.colors.danger} />
          </View>

          <View style={styles.qualityRow}>
            <Badge>{pl.stats.excellent}: {report.qualityCounts.excellent}</Badge>
            <Badge>{pl.stats.good}: {report.qualityCounts.good}</Badge>
            <Badge tone="danger">{pl.stats.needsReview}: {report.qualityCounts.needs_review}</Badge>
          </View>

          <View style={styles.actions}>
            <PrimaryButton label={pl.studio.autotag} variant="outline" onPress={doAutoTag} />
            <PrimaryButton label={pl.studio.translate} variant="outline" onPress={doTranslate} />
            {report.duplicates.length > 0 && <PrimaryButton label={pl.studio.merge} variant="outline" onPress={doMerge} />}
          </View>

          {note && <Text style={styles.note}>{note}</Text>}

          {report.invalid.length > 0 && (
            <>
              <SectionTitle>{pl.studio.invalid}</SectionTitle>
              {report.invalid.map((e, i) => (
                <Card key={i} style={styles.errCard}>
                  <Text style={styles.errTitle}>Wiersz {e.row}{e.title ? ` — ${e.title}` : ''}</Text>
                  {e.messages.map((m, j) => <Text key={j} style={styles.errMsg}>• {m}</Text>)}
                </Card>
              ))}
            </>
          )}

          {report.suspicious.length > 0 && (
            <>
              <SectionTitle>{pl.studio.suspicious}</SectionTitle>
              {report.suspicious.map((s, i) => (
                <Card key={i} style={styles.warnCard}>
                  <Text style={styles.warnTitle}>{s.title ?? `Rekord ${s.index + 1}`}</Text>
                  {s.reasons.map((r, j) => <Text key={j} style={styles.warnMsg}>• {r}</Text>)}
                </Card>
              ))}
            </>
          )}

          <View style={{ height: 8 }} />
          <PrimaryButton label={`${pl.studio.import} (${working.length})`} onPress={doImport} disabled={working.length === 0} />
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  subtitle: { color: theme.colors.textMuted, marginBottom: 12, fontSize: theme.font.body },
  toggle: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: theme.colors.accent, borderRadius: 18, padding: 4, marginBottom: 10 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 20, borderRadius: 14 },
  toggleActive: { backgroundColor: theme.colors.primary },
  toggleText: { color: theme.colors.primary, fontWeight: '700' },
  toggleTextActive: { color: '#fff' },
  input: { minHeight: 150, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: theme.font.small, color: theme.colors.text, textAlignVertical: 'top', fontFamily: 'monospace' },
  zip: { color: theme.colors.textMuted, fontSize: theme.font.small, marginVertical: 8, fontStyle: 'italic' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', paddingVertical: 12 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  qualityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  actions: { marginTop: 12, gap: 0 },
  note: { color: theme.colors.primary, marginTop: 8, fontSize: theme.font.small, fontWeight: '600' },
  errCard: { backgroundColor: theme.colors.dangerBg, borderColor: '#ffd8a8' },
  errTitle: { color: theme.colors.danger, fontWeight: '700', marginBottom: 4 },
  errMsg: { color: theme.colors.danger, fontSize: theme.font.small, lineHeight: 18 },
  warnCard: { backgroundColor: '#fffbe6', borderColor: '#ffe58f' },
  warnTitle: { color: '#ad6800', fontWeight: '700', marginBottom: 4 },
  warnMsg: { color: '#ad6800', fontSize: theme.font.small, lineHeight: 18 },
});
