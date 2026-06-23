import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { DifficultyLevel } from '../types';
import { Card, Badge } from '../components/ui';
import { theme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'SelectLevel'>;

const REGION_LABEL: Record<string, string> = {
  neck: 'odcinek szyjny',
  shoulder: 'bark',
  elbow: 'łokieć',
  wrist_hand: 'nadgarstek/ręka',
  thoracic: 'odcinek piersiowy',
  lower_back: 'dolny odcinek pleców',
  hip: 'biodro',
  knee: 'kolano',
  ankle_foot: 'staw skokowy/stopa',
  general: 'ogólna sprawność',
};

const LEVELS: { key: DifficultyLevel; title: string; desc: string }[] = [
  { key: 'easy', title: pl.level.easy, desc: pl.level.easyDesc },
  { key: 'medium', title: pl.level.medium, desc: pl.level.mediumDesc },
  { key: 'advanced', title: pl.level.advanced, desc: pl.level.advancedDesc },
];

export default function SelectLevelScreen({ route, navigation }: Props) {
  const { analysis } = route.params;
  const regionLabel = REGION_LABEL[analysis.regions[0]] ?? '—';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>{pl.level.subtitle}</Text>
      <Badge>{regionLabel}</Badge>

      {analysis.redFlags.length > 0 && (
        <Card style={styles.alert}>
          <Text style={styles.alertTitle}>⚠️ {pl.plan.redFlags}</Text>
          {analysis.redFlags.map((r) => (
            <Text key={r.code} style={styles.alertText}>
              • {r.message_pl}
            </Text>
          ))}
        </Card>
      )}

      <Text style={styles.title}>{pl.level.title}</Text>
      {LEVELS.map((lvl) => (
        <TouchableOpacity
          key={lvl.key}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Plan', { analysis, level: lvl.key })}
        >
          <Card>
            <Text style={styles.levelTitle}>{lvl.title}</Text>
            <Text style={styles.levelDesc}>{lvl.desc}</Text>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  subtitle: { color: theme.colors.textMuted, marginBottom: 6 },
  title: { fontSize: theme.font.h2, fontWeight: '700', color: theme.colors.text, marginTop: 22, marginBottom: 8 },
  levelTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.primary },
  levelDesc: { color: theme.colors.textMuted, marginTop: 4, fontSize: theme.font.small },
  alert: { backgroundColor: theme.colors.dangerBg, borderColor: '#ffd8a8', marginTop: 14 },
  alertTitle: { color: theme.colors.danger, fontWeight: '700', marginBottom: 6 },
  alertText: { color: theme.colors.danger, fontSize: theme.font.small, lineHeight: 19, marginVertical: 2 },
});
