import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Home } from '../screens/Home';
import { Insights } from '../screens/Insights';
import { LockList } from '../screens/LockList';
import { SettingsStack } from './SettingsStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Insights: 'stats-chart',
  LockList: 'lock-closed',
  Settings: 'settings',
};

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Home: 'בית',
  Insights: 'תובנות',
  LockList: 'רשימת נעילה',
  Settings: 'הגדרות',
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name]} color={color} size={size} />,
        // Built-in shift transition instead of the default instant switch —
        // no extra dependency (bottom-tabs animates this with the core
        // Animated API, not Reanimated).
        animation: 'shift',
      })}
    >
      <Tab.Screen name="Home" component={Home} options={{ title: TAB_LABELS.Home }} />
      <Tab.Screen name="Insights" component={Insights} options={{ title: TAB_LABELS.Insights }} />
      <Tab.Screen name="LockList" component={LockList} options={{ title: TAB_LABELS.LockList }} />
      <Tab.Screen name="Settings" component={SettingsStack} options={{ title: TAB_LABELS.Settings, headerShown: false }} />
    </Tab.Navigator>
  );
}