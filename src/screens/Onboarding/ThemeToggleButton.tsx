import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, type ThemeColors } from '../../theme';

const hit = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

/**
 * A quick light/dark toggle shown on the first two onboarding pages
 * ("Embrace" + "Lockdown" — see steps/IntroPager.tsx), so someone who lands
 * in a bright room at night doesn't have to sit through the rest of
 * onboarding before they can dim the app. Later screens don't need this —
 * Settings carries the full light/dark/system control (see
 * Settings/ThemeModeRow.tsx).
 */
export function ThemeToggleButton() {
  const insets = useSafeAreaInsets();
  const { scheme, setMode, colors } = useTheme();
  const styles = createStyles(colors);
  const isDark = scheme === 'dark';

  return (
    <View style={[styles.wrap, { top: insets.top + 12 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isDark ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
        hitSlop={12}
        style={styles.button}
        onPress={() => {
          hit();
          setMode(isDark ? 'light' : 'dark');
        }}
      >
        <Ionicons name={isDark ? 'moon' : 'moon-outline'} size={22} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.hint}>יהיה אפשרי לשנות שוב בהמשך</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Row layout keeps the whole block within the button's own 40px band —
    // stacking the hint underneath instead pushed it down into the headline
    // that starts right below (see ScreenTwo/ScreenThree paddingTop).
    wrap: {
      position: 'absolute',
      left: 20,
      zIndex: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    button: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    hint: {
      maxWidth: 110,
      fontSize: 10,
      lineHeight: 13,
      color: colors.textMuted,
      textAlign: 'right',
    },
  });
}
