import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../../haptics';
import { useTheme, type ThemeMode } from '../../theme';
import type { ThemeColors, Typography } from '../../theme';

const OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'light', label: 'בהיר', icon: 'sunny' },
  { mode: 'dark', label: 'כהה', icon: 'moon' },
  { mode: 'system', label: 'ברירת מחדל של המערכת', icon: 'phone-portrait-outline' },
];

/** Settings row for choosing the app's light/dark/system theme — a 3-way segmented control, each segment tapping straight to that mode. */
export function ThemeModeRow() {
  const { mode, setMode, colors, typography } = useTheme();
  const styles = createStyles(colors, typography);

  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const selected = option.mode === mode;
        return (
          <Pressable
            key={option.mode}
            style={({ pressed }) => [styles.segment, selected && styles.segmentSelected, pressed && styles.segmentPressed]}
            onPress={() => {
              haptics.selection();
              setMode(option.mode);
            }}
          >
            <Ionicons name={option.icon} size={20} color={selected ? colors.background : colors.textSecondary} />
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row-reverse',
      padding: 4,
      gap: 4,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: 12,
    },
    segmentSelected: {
      backgroundColor: colors.primary,
    },
    segmentPressed: {
      opacity: 0.8,
    },
    label: {
      ...typography.caption,
      textAlign: 'center',
    },
    labelSelected: {
      color: colors.background,
      fontWeight: '700',
    },
  });
}
