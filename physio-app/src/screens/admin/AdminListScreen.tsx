import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { Exercise } from '../../types';
import { Card, PrimaryButton } from '../../components/ui';
import { theme } from '../../theme';
import { pl } from '../../i18n/pl';
import { getAllExercises, deleteExercise, seedSupabaseFromSamples } from '../../services/exerciseService';
import { isSupabaseConfigured } from '../../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminList'>;

export default function AdminListScreen({ navigation }: Props) {
  const [items, setItems] = useState<Exercise[]>([]);

  const load = useCallback(() => {
    getAllExercises().then(setItems);
  }, []);

  useFocusEffect(load);

  function onDelete(ex: Exercise) {
    Alert.alert(pl.admin.delete, pl.admin.deleteConfirm, [
      { text: pl.common.cancel, style: 'cancel' },
      {
        text: pl.admin.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExercise(ex.id);
            load();
          } catch (e: any) {
            Alert.alert('Błąd', e?.message ?? '');
          }
        },
      },
    ]);
  }

  async function onSeed() {
    try {
      const n = await seedSupabaseFromSamples();
      Alert.alert('OK', `Dodano ${n} ćwiczeń.`);
      load();
    } catch (e: any) {
      Alert.alert('Błąd', e?.message ?? '');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!isSupabaseConfigured && (
        <Card style={styles.warn}>
          <Text style={styles.warnText}>{pl.admin.notConfigured}</Text>
        </Card>
      )}

      <PrimaryButton label={pl.admin.add} onPress={() => navigation.navigate('AdminEdit', {})} />
      <PrimaryButton label={pl.studio.title} variant="outline" onPress={() => navigation.navigate('ImportStudio')} />
      {isSupabaseConfigured && <PrimaryButton label={pl.admin.seed} variant="outline" onPress={onSeed} />}

      <Text style={styles.count}>{items.length} ćwiczeń</Text>

      {items.map((ex) => (
        <Card key={ex.id}>
          <Text style={styles.title}>{ex.title_pl}</Text>
          <Text style={styles.meta}>
            {ex.body_region} • poziom {ex.difficulty_level}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => navigation.navigate('AdminEdit', { exerciseId: ex.id })}>
              <Text style={styles.editLink}>{pl.admin.edit}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(ex)}>
              <Text style={styles.deleteLink}>{pl.admin.delete}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  warn: { backgroundColor: theme.colors.dangerBg, borderColor: '#ffd8a8' },
  warnText: { color: theme.colors.danger, fontSize: theme.font.small },
  count: { color: theme.colors.textMuted, marginVertical: 12 },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  meta: { color: theme.colors.textMuted, fontSize: theme.font.small, marginTop: 2 },
  actions: { flexDirection: 'row', marginTop: 10, gap: 24 },
  editLink: { color: theme.colors.primary, fontWeight: '700' },
  deleteLink: { color: theme.colors.danger, fontWeight: '700' },
});
