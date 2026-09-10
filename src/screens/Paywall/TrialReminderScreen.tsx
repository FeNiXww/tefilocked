import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getOnboardingGender } from '../../data/storage/mmkv';
import { pickG } from '../Onboarding/onboardingState';
import { TRIAL_LENGTH_DAYS } from '../../subscriptions/trialConfig';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

/** Second paywall screen — sets the expectation that a reminder is coming, so the eventual "trial ending" notification never feels like a surprise. */
export function TrialReminderScreen({ onNext }: { onNext: () => void }) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const gender = getOnboardingGender();
  return (
    <View style={styles.container}>
      <View style={styles.bellWrap}>
        {/* `bellWrap`'s `accentLight` fill is a fixed light tone in both
            themes (see colors.ts), so the icon is fixed to match — the
            theme-reactive `colors.accentDark` would turn light pastel-blue
            in dark mode against this always-light circle. */}
        <Ionicons name="notifications" size={40} color={lightColors.accentDark} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>1</Text>
        </View>
      </View>

      <Text style={styles.title}>{pickG(gender, 'לא תחויב עד שתחליט', 'לא תחויבי עד שתחליטי')}</Text>
      <Text style={styles.body}>
        {`יום לפני שתקופת הניסיון החינמי בת ${TRIAL_LENGTH_DAYS} הימים מסתיימת, נשלח לך תזכורת עדינה — כדי שזה לעולם לא יפתיע אותך.`}
      </Text>

      <PrimaryButton label="המשך בחינם" onPress={onNext} variant="accent" style={styles.button} />
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: spacing.md,
    },
    bellWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.background,
    },
    title: {
      ...typography.hero,
      fontSize: 24,
      textAlign: 'center',
    },
    body: {
      ...typography.bodySecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.sm,
    },
    button: {
      marginTop: spacing.lg,
      alignSelf: 'stretch',
    },
  });
}
