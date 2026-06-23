import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { PrimaryButton, Card, TestVersionBanner } from '../components/ui';
import { theme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{pl.appName}</Text>
      <Text style={styles.tagline}>{pl.tagline}</Text>

      <View style={{ height: 12 }} />
      <TestVersionBanner />

      <View style={{ height: 16 }} />

      <PrimaryButton label={pl.home.start} onPress={() => navigation.navigate('Describe')} />
      <PrimaryButton label={pl.home2.bodyMap} variant="outline" onPress={() => navigation.navigate('BodyMap')} />
      <PrimaryButton label={pl.home2.library} variant="outline" onPress={() => navigation.navigate('Library')} />
      <PrimaryButton label={pl.home2.stats} variant="outline" onPress={() => navigation.navigate('Stats')} />
      <PrimaryButton label={pl.home.admin} variant="outline" onPress={() => navigation.navigate('AdminList')} />

      <Card style={{ marginTop: 24, backgroundColor: theme.colors.dangerBg, borderColor: '#ffd8a8' }}>
        <Text style={styles.disclaimer}>{pl.home.disclaimer}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, justifyContent: 'center', paddingVertical: 32 },
  title: { fontSize: 32, fontWeight: '800', color: theme.colors.primary, textAlign: 'center' },
  tagline: {
    fontSize: theme.font.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  disclaimer: { color: theme.colors.danger, fontSize: theme.font.small, lineHeight: 19 },
});
