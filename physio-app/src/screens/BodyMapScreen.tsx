import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { BodyRegion } from '../types';
import { PrimaryButton } from '../components/ui';
import { theme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'BodyMap'>;

// Anatomically-arranged, dependency-free tappable regions. Each cell maps a
// label to a BodyRegion the analyzer understands. Front/back changes the set.
type Cell = { label: string; region: BodyRegion; col?: number };

const FRONT: Cell[][] = [
  [{ label: 'Szyja', region: 'neck' }],
  [{ label: 'Bark L', region: 'shoulder' }, { label: 'Kl. piersiowa', region: 'thoracic' }, { label: 'Bark P', region: 'shoulder' }],
  [{ label: 'Łokieć L', region: 'elbow' }, { label: 'Brzuch/Plecy', region: 'lower_back' }, { label: 'Łokieć P', region: 'elbow' }],
  [{ label: 'Nadg. L', region: 'wrist_hand' }, { label: 'Biodro', region: 'hip' }, { label: 'Nadg. P', region: 'wrist_hand' }],
  [{ label: 'Kolano L', region: 'knee' }, { label: 'Kolano P', region: 'knee' }],
  [{ label: 'Kostka/Stopa L', region: 'ankle_foot' }, { label: 'Kostka/Stopa P', region: 'ankle_foot' }],
];

const BACK: Cell[][] = [
  [{ label: 'Kark', region: 'neck' }],
  [{ label: 'Odc. piersiowy', region: 'thoracic' }],
  [{ label: 'Odc. lędźwiowy', region: 'lower_back' }],
  [{ label: 'Pośladek L', region: 'hip' }, { label: 'Pośladek P', region: 'hip' }],
  [{ label: 'Udo/Kolano L', region: 'knee' }, { label: 'Udo/Kolano P', region: 'knee' }],
  [{ label: 'Łydka L', region: 'ankle_foot' }, { label: 'Łydka P', region: 'ankle_foot' }],
];

const REGION_LABEL: Record<BodyRegion, string> = {
  neck: 'szyja/kark', shoulder: 'bark', elbow: 'łokieć', wrist_hand: 'nadgarstek/ręka',
  thoracic: 'odcinek piersiowy', lower_back: 'dolny odcinek pleców', hip: 'biodro',
  knee: 'kolano', ankle_foot: 'kostka/stopa', general: 'ogólne',
};

export default function BodyMapScreen({ navigation }: Props) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [selected, setSelected] = useState<BodyRegion | null>(null);
  const rows = side === 'front' ? FRONT : BACK;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>{pl.bodyMap.subtitle}</Text>

      <View style={styles.toggle}>
        {(['front', 'back'] as const).map((s) => (
          <Pressable key={s} onPress={() => setSide(s)} style={[styles.toggleBtn, side === s && styles.toggleActive]}>
            <Text style={[styles.toggleText, side === s && styles.toggleTextActive]}>
              {s === 'front' ? pl.bodyMap.front : pl.bodyMap.back}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.figure}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((cell, ci) => {
              const active = selected === cell.region;
              return (
                <Pressable
                  key={ci}
                  onPress={() => setSelected(cell.region)}
                  style={[styles.cell, active && styles.cellActive]}
                >
                  <Text style={[styles.cellText, active && styles.cellTextActive]}>{cell.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {selected && (
        <Text style={styles.selected}>
          {pl.bodyMap.selected} <Text style={styles.selectedVal}>{REGION_LABEL[selected]}</Text>
        </Text>
      )}

      <PrimaryButton
        label={pl.bodyMap.continue}
        disabled={!selected}
        onPress={() => navigation.navigate('Interview', { region: selected ?? undefined, rawText: '' })}
      />
      <PrimaryButton label={pl.bodyMap.skip} variant="outline" onPress={() => navigation.navigate('Describe')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  subtitle: { color: theme.colors.textMuted, marginBottom: 12, fontSize: theme.font.body },
  toggle: { flexDirection: 'row', alignSelf: 'center', backgroundColor: theme.colors.accent, borderRadius: 20, padding: 4, marginBottom: 16 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 22, borderRadius: 16 },
  toggleActive: { backgroundColor: theme.colors.primary },
  toggleText: { color: theme.colors.primary, fontWeight: '700' },
  toggleTextActive: { color: '#fff' },
  figure: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 12, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  cell: { flex: 1, minHeight: 48, borderRadius: theme.radius.md, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 8 },
  cellActive: { backgroundColor: theme.colors.primary },
  cellText: { color: theme.colors.primary, fontWeight: '600', fontSize: theme.font.small, textAlign: 'center' },
  cellTextActive: { color: '#fff' },
  selected: { textAlign: 'center', marginVertical: 14, color: theme.colors.text, fontSize: theme.font.body },
  selectedVal: { fontWeight: '700', color: theme.colors.primary },
});
