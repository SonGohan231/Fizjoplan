import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { PrimaryButton } from '../components/ui';
import { theme } from '../theme';
import { pl } from '../i18n/pl';
import { analyzeAsync, needsClarification } from '../engine/analyzer';

type Props = NativeStackScreenProps<RootStackParamList, 'Describe'>;

export default function DescribeProblemScreen({ navigation }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAnalyze() {
    if (!text.trim()) {
      setError(pl.describe.empty);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const analysis = await analyzeAsync(text.trim());
      // When the description is too vague, deepen with the clinical interview.
      if (needsClarification(analysis)) {
        navigation.navigate('Interview', { rawText: text.trim() });
      } else {
        navigation.navigate('SelectLevel', { analysis });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>{pl.describe.title}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={pl.describe.placeholder}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.examplesLabel}>{pl.describe.examplesLabel}</Text>
      {pl.describe.examples.map((ex) => (
        <TouchableOpacity key={ex} style={styles.chip} onPress={() => setText(ex)}>
          <Text style={styles.chipText}>{ex}</Text>
        </TouchableOpacity>
      ))}

      <View style={{ height: 12 }} />
      <PrimaryButton label={pl.describe.analyze} onPress={onAnalyze} loading={busy} />
      <PrimaryButton
        label={pl.home2.interview}
        variant="outline"
        onPress={() => navigation.navigate('Interview', { rawText: text.trim() })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { fontSize: theme.font.h2, fontWeight: '700', color: theme.colors.text, marginBottom: 10 },
  input: {
    minHeight: 110,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    fontSize: theme.font.body,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  error: { color: theme.colors.danger, marginTop: 8 },
  examplesLabel: { marginTop: 20, marginBottom: 8, color: theme.colors.textMuted, fontWeight: '600' },
  chip: {
    backgroundColor: theme.colors.accent,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginVertical: 4,
    alignSelf: 'flex-start',
  },
  chipText: { color: theme.colors.primary, fontSize: theme.font.small, fontWeight: '600' },
});
