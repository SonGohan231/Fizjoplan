import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Pressable, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Exercise, BodyRegion } from '../types';
import { Card, Badge, PrimaryButton } from '../components/ui';
import { theme } from '../theme';
import { pl } from '../i18n/pl';
import { queryExercises, ExerciseFilters, invalidateCache } from '../services/exerciseRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'Library'>;

const REGIONS: BodyRegion[] = ['neck','shoulder','elbow','wrist_hand','thoracic','lower_back','hip','knee','ankle_foot','general'];
const DIFFS = [1, 2, 3];
const PAGE = 20;

export default function LibraryScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<BodyRegion | undefined>();
  const [difficulty, setDifficulty] = useState<number | undefined>();
  const [items, setItems] = useState<Exercise[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const filters: ExerciseFilters = { query: query.trim() || undefined, region, difficulty };

  const load = useCallback(async (nextPage: number, append: boolean) => {
    const res = await queryExercises(filters, nextPage, PAGE);
    setItems((prev) => (append ? [...prev, ...res.items] : res.items));
    setTotal(res.total);
    setHasMore(res.hasMore);
    setPage(nextPage);
  }, [query, region, difficulty]);

  useEffect(() => { invalidateCache(); load(0, false); }, [region, difficulty]);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => load(0, false)}
        placeholder={pl.library.search}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.search}
        returnKeyType="search"
      />
      <PrimaryButton label={pl.library.results} onPress={() => load(0, false)} />

      <Text style={styles.filterLabel}>{pl.library.region}</Text>
      <View style={styles.chips}>
        <Chip label={pl.library.all} active={!region} onPress={() => setRegion(undefined)} />
        {REGIONS.map((r) => <Chip key={r} label={r} active={region === r} onPress={() => setRegion(r)} />)}
      </View>

      <Text style={styles.filterLabel}>{pl.library.difficulty}</Text>
      <View style={styles.chips}>
        <Chip label={pl.library.all} active={!difficulty} onPress={() => setDifficulty(undefined)} />
        {DIFFS.map((d) => <Chip key={d} label={`poziom ${d}`} active={difficulty === d} onPress={() => setDifficulty(d)} />)}
      </View>

      <Text style={styles.count}>{total} {pl.library.results.toLowerCase()}</Text>

      {items.length === 0 && <Text style={styles.empty}>{pl.library.empty}</Text>}

      {items.map((ex) => (
        <TouchableOpacity key={ex.id} activeOpacity={0.85} onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: ex.id })}>
          <Card>
            <Text style={styles.title}>{ex.title_pl}</Text>
            <View style={styles.metaRow}>
              <Badge>{ex.body_region}</Badge>
              <Badge>poziom {ex.difficulty_level}</Badge>
            </View>
            <Text style={styles.desc} numberOfLines={2}>{ex.description_pl}</Text>
          </Card>
        </TouchableOpacity>
      ))}

      {hasMore && <PrimaryButton label={pl.library.more} variant="outline" onPress={() => load(page + 1, true)} />}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  search: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: theme.font.body, color: theme.colors.text, marginBottom: 8 },
  filterLabel: { marginTop: 14, marginBottom: 6, color: theme.colors.textMuted, fontWeight: '700', fontSize: theme.font.small },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: theme.colors.accent, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { color: theme.colors.primary, fontWeight: '600', fontSize: theme.font.small },
  chipTextActive: { color: '#fff' },
  count: { color: theme.colors.textMuted, marginVertical: 12 },
  empty: { color: theme.colors.textMuted, fontStyle: 'italic', marginVertical: 12 },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  metaRow: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  desc: { color: theme.colors.textMuted, fontSize: theme.font.small, lineHeight: 19 },
});
