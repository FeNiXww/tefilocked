import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MagenDavidStreak } from '../../components/MagenDavidStreak';
import { PrimaryButton } from '../../components/PrimaryButton';
import { previewLine } from '../../content';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';
import type { ContentItem } from '../../content/types';

interface CompletionScreenProps {
  streak: number;
  verseItem: ContentItem | null;
  onFinish: () => void;
  finishing: boolean;
}

/** The reward beat after "I've prayed today": updated streak, then the verse of the day, then access is granted. */
export function CompletionScreen({ streak, verseItem, onFinish, finishing }: CompletionScreenProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
    >
      <Text style={styles.title}>יישר כוח!</Text>

      <MagenDavidStreak streak={streak} litToday size={120} />
      <Text style={styles.streakLabel}>{streak} ימים ברצף</Text>

      {verseItem && (
        <View style={styles.verseCard}>
          <Text style={styles.verseEyebrow}>פסוק היום · {verseItem.title}</Text>
          <Text style={styles.verseText}>{previewLine(verseItem)}</Text>
          <Text style={styles.verseSource}>{verseItem.source}</Text>
        </View>
      )}

      <PrimaryButton
        label={finishing ? 'רגע...' : 'סיימתי!'}
        onPress={onFinish}
        disabled={finishing}
        variant="accent"
        style={styles.button}
      />
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      alignSelf: 'stretch',
    },
    // `flexGrow: 1` + `justifyContent: 'center'` keeps this centered like a
    // plain View when it fits the screen, but — unlike a plain View — lets the
    // ScrollView scroll it into view when the verse card pushes the "סיימתי!"
    // button below the fold on shorter screens instead of clipping it.
    container: {
      flexGrow: 1,
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    title: {
      ...typography.hero,
      fontSize: 26,
      color: colors.accentDark,
    },
    streakLabel: {
      ...typography.body,
      fontWeight: '600',
    },
    verseCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      alignSelf: 'stretch',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    verseEyebrow: {
      ...typography.eyebrow,
      textAlign: 'right',
    },
    verseText: {
      ...typography.body,
      textAlign: 'right',
    },
    verseSource: {
      ...typography.caption,
      textAlign: 'right',
    },
    button: {
      marginTop: spacing.lg,
      alignSelf: 'stretch',
    },
  });
}
