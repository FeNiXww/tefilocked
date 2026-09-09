import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AboutScreen } from '../screens/Settings/AboutScreen';
import { EditGender } from '../screens/Settings/EditGender';
import { EditRegion } from '../screens/Settings/EditRegion';
import { LegalDocument } from '../screens/Settings/LegalDocument';
import { Settings } from '../screens/Settings';
import { PRIVACY_TEXT, TERMS_TEXT } from '../legal/legalText';
import { useTheme } from '../theme';
import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="SettingsHome" component={Settings} options={{ title: 'הגדרות' }} />
      <Stack.Screen name="EditGender" options={{ title: 'מגדר' }}>
        {({ navigation }) => <EditGender onComplete={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="EditRegion" options={{ title: 'אזור' }}>
        {({ navigation }) => <EditRegion onComplete={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'אודות' }} />
      <Stack.Screen name="Terms" options={{ title: 'תנאי שימוש' }}>
        {() => <LegalDocument title="תנאי שימוש" body={TERMS_TEXT} />}
      </Stack.Screen>
      <Stack.Screen name="Privacy" options={{ title: 'מדיניות פרטיות' }}>
        {() => <LegalDocument title="מדיניות פרטיות" body={PRIVACY_TEXT} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}