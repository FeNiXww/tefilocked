import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getOnboardingGender } from '../../data/storage/mmkv';
import { pickG } from '../Onboarding/onboardingState';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

export type PhoneRestrictedGreeting = 'shabbat' | 'yomKippur' | 'yomTov';

const GREETING_TEXT: Record<PhoneRestrictedGreeting, string> = {
  shabbat: 'שבת שלום',
  // Yom Kippur is a solemn fast day, not a festive one — "חג שמח" (the
  // generic Yom Tov greeting below) would be an odd, tone-deaf thing to say
  // on it. "צום קל" (an easy fast) is the conventional greeting.
  yomKippur: 'צום קל',
  yomTov: 'חג שמח',
};

interface PhoneRestrictedScreenProps {
  greeting: PhoneRestrictedGreeting;
  onDismiss: () => void;
}

/**
 * Shown instead of the normal prayer flow when a locked app is opened on
 * Shabbat/Yom Tov with streak protection enabled (see App.tsx, which decides
 * this using `isPhoneRestrictedDay` + `isStreakProtectionEnabled` before ever
 * mounting `LockContentFlow`) — asking for a prayer through the phone would
 * defeat the point of a day phone use is halachically restricted on. Never
 * records an unlock event and never unlocks the target app; `onDismiss` just
 * returns to Tefillok's own Home screen, leaving the locked app locked.
 */
export function PhoneRestrictedScreen({ greeting, onDismiss }: PhoneRestrictedScreenProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const gender = getOnboardingGender();

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="moon" size={40} color={lightColors.accentDark} />
      </View>

      <Text style={styles.title}>{GREETING_TEXT[greeting]}</Text>
      <Text style={styles.body}>
        {pickG(gender, 'אתה לא אמור להשתמש בטלפון היום.', 'את לא אמורה להשתמש בטלפון היום.')}
      </Text>
      <Text style={styles.body}>הרצף שלך מוגן ולא ייפגע מכך.</Text>

      <PrimaryButton label="סגירה" onPress={onDismiss} variant="accent" style={styles.button} />
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      backgroundColor: colors.background,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
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
