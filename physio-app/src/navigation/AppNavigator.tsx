import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AnalysisResult, BodyRegion, DifficultyLevel, RehabPlan } from '../types';
import { theme } from '../theme';
import { pl } from '../i18n/pl';

import HomeScreen from '../screens/HomeScreen';
import DescribeProblemScreen from '../screens/DescribeProblemScreen';
import SelectLevelScreen from '../screens/SelectLevelScreen';
import PlanScreen from '../screens/PlanScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import AdminListScreen from '../screens/admin/AdminListScreen';
import AdminEditScreen from '../screens/admin/AdminEditScreen';
import BodyMapScreen from '../screens/BodyMapScreen';
import ClinicalInterviewScreen from '../screens/ClinicalInterviewScreen';
import LibraryScreen from '../screens/LibraryScreen';
import StatsScreen from '../screens/StatsScreen';
import ImportStudioScreen from '../screens/ImportStudioScreen';

// Strongly-typed navigation params shared across the flow.
export type RootStackParamList = {
  Home: undefined;
  Describe: undefined;
  SelectLevel: { analysis: AnalysisResult };
  Plan: { analysis: AnalysisResult; level: DifficultyLevel };
  ExerciseDetail: { exerciseId: string };
  AdminList: undefined;
  AdminEdit: { exerciseId?: string } | undefined;
  BodyMap: undefined;
  Interview: { region?: BodyRegion; rawText?: string } | undefined;
  Library: undefined;
  Stats: undefined;
  ImportStudio: undefined;
};

// For convenience in screens:
export type PlanRouteParams = { analysis: AnalysisResult; level: DifficultyLevel };
export type { RehabPlan };

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: pl.appName }} />
      <Stack.Screen name="Describe" component={DescribeProblemScreen} options={{ title: pl.describe.title }} />
      <Stack.Screen name="SelectLevel" component={SelectLevelScreen} options={{ title: pl.level.title }} />
      <Stack.Screen name="Plan" component={PlanScreen} options={{ title: pl.plan.title }} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: pl.plan.details }} />
      <Stack.Screen name="AdminList" component={AdminListScreen} options={{ title: pl.admin.title }} />
      <Stack.Screen name="AdminEdit" component={AdminEditScreen} options={{ title: pl.admin.edit }} />
      <Stack.Screen name="BodyMap" component={BodyMapScreen} options={{ title: pl.bodyMap.title }} />
      <Stack.Screen name="Interview" component={ClinicalInterviewScreen} options={{ title: pl.interview.title }} />
      <Stack.Screen name="Library" component={LibraryScreen} options={{ title: pl.library.title }} />
      <Stack.Screen name="Stats" component={StatsScreen} options={{ title: pl.stats.title }} />
      <Stack.Screen name="ImportStudio" component={ImportStudioScreen} options={{ title: pl.studio.title }} />
    </Stack.Navigator>
  );
}
