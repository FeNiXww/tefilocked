import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, type ThemeColors } from '../../theme';

const hit = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

/**
 * A light/dark choice shown on the first two onboarding pages ("Embrace" +
 * "Lockdown" — see steps/IntroPager.tsx), so someone who lands in a bright
 * room at night doesn't have to sit through the rest of onboarding before
 * dimming the app. Deliberately two paired buttons (not one toggle icon with
 * a caption floating beside it) so the choice and its "you can change this
 * later" footnote read as one coherent unit instead of two disconnected
 * elements. Later screens don't need this — Settings carries the full
 * light/dark/system control (see Settings/ThemeModeRow.tsx).
 */
export function ThemeToggleButton() {
  const insets = useSafeAreaInsets();
  const { scheme, setMode, colors } = useTheme();
  const styles = createStyles(colors);
  const isDark = scheme === 'dark';

  const choose = (mode: 'light' | 'dark') => {
    if (mode === (isDark ? 'dark' : 'light')) return;
    hit();
    setMode(mode);
  };

  return (
    <View style={[styles.wrap, { top: insets.top + 12 }]}>
      <View style={styles.pair}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="מצב בהיר"
          accessibilityState={{ selected: !isDark }}
          hitSlop={8}
          style={[styles.option, !isDark && styles.optionActive]}
          onPress={() => choose('light')}
        >
          <Ionicons name="sunny-outline" size={17} color={!isDark ? colors.accentDark : colors.textMuted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="מצב כהה"
          accessibilityState={{ selected: isDark }}
          hitSlop={8}
          style={[styles.option, isDark && styles.optionActive]}
          onPress={() => choose('dark')}
        >
          <Ionicons name="moon-outline" size={17} color={isDark ? colors.accentDark : colors.textMuted} />
        </Pressable>
      </View>
      <Text style={styles.hint}>ניתן לשנות בכל עת בהגדרות</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 20,
      zIndex: 20,
      alignItems: 'flex-start',
      gap: 4,
    },
    pair: {
      flexDirection: 'row',
      gap: 2,
      padding: 3,
      borderRadius: 18,
      backgroundColor: colors.surface,
    },
    option: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionActive: {
      backgroundColor: colors.accentLight,
    },
    hint: {
      maxWidth: 130,
      fontSize: 10,
      lineHeight: 13,
      color: colors.textMuted,
      textAlign: 'left',
    },
  });
}
