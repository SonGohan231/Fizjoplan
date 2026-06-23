import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { PrimaryButton, Card } from '../components/ui';
import { theme } from '../theme';
import { pl } from '../i18n/pl';
import {
  InterviewState, nextQuestion, applyAnswer, analyzeInterview, INTERVIEW_MAX_QUESTIONS,
} from '../engine/clinicalInterview';

type Props = NativeStackScreenProps<RootStackParamList, 'Interview'>;

export default function ClinicalInterviewScreen({ route, navigation }: Props) {
  const initial: InterviewState = {
    rawText: route.params?.rawText ?? '',
    region: route.params?.region,
    answers: {},
  };
  const [state, setState] = useState<InterviewState>(initial);

  const current = useMemo(() => nextQuestion(state), [state]);
  const answeredCount = Object.keys(state.answers).length;

  function choose(value: string) {
    if (!current) return;
    setState((s) => applyAnswer(s, current.id, value));
  }

  function finish() {
    const analysis = analyzeInterview(state);
    navigation.navigate('SelectLevel', { analysis });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>{pl.interview.intro}</Text>

      {current ? (
        <>
          <Text style={styles.progress}>
            {pl.interview.progress} {answeredCount + 1} {pl.interview.of} {INTERVIEW_MAX_QUESTIONS}
          </Text>
          <Card>
            <Text style={styles.question}>{current.question_pl}</Text>
            {current.options.map((opt, i) => (
              <Pressable key={i} onPress={() => choose(opt.value)} style={styles.option}>
                <Text style={styles.optionText}>{opt.label_pl}</Text>
              </Pressable>
            ))}
          </Card>
          <View style={{ height: 10 }} />
          <PrimaryButton label={pl.interview.finish} variant="outline" onPress={finish} />
        </>
      ) : (
        <Card>
          <Text style={styles.done}>Wywiad zakończony. Możesz wygenerować plan.</Text>
          <View style={{ height: 10 }} />
          <PrimaryButton label={pl.interview.generate} onPress={finish} />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  intro: { color: theme.colors.textMuted, marginBottom: 14, fontSize: theme.font.body, lineHeight: 20 },
  progress: { color: theme.colors.primary, fontWeight: '700', marginBottom: 8 },
  question: { fontSize: theme.font.h2, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  option: { backgroundColor: theme.colors.accent, borderRadius: theme.radius.md, paddingVertical: 14, paddingHorizontal: 16, marginVertical: 5 },
  optionText: { color: theme.colors.primary, fontWeight: '600', fontSize: theme.font.body },
  done: { color: theme.colors.text, fontSize: theme.font.body },
});
