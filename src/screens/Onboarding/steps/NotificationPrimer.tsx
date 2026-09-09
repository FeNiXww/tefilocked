import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { FlameIcon } from '../../../components/FlameIcon';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { TextLinkButton } from '../../../components/TextLinkButton';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import type { StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

/**
 * A custom explanation screen shown BEFORE the real Android notification
 * permission prompt — so the system dialog never appears out of nowhere.
 * Never blocks onboarding: whatever the user answers, onNext fires right
 * after, and this is the last onboarding step before the paywall.
 */
export function NotificationPrimer({ update, onNext, onBack, progress }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      update({ notificationsEnabled: status === 'granted' });
    } catch {
      update({ notificationsEnabled: false });
    } finally {
      onNext();
    }
  };

  const handleDecline = () => {
    if (requesting) return;
    update({ notificationsEnabled: false });
    onNext();
  };

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress} tone="accent">
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="notifications" size={40} color={colors.accentDark} style={styles.bellIcon} />
          <FlameIcon size={28} />
        </View>

        <Text style={styles.eyebrow}>רגע אחרון</Text>
        <HighlightText text="אל תפספסו את **הרגע שלכם**" style={styles.title} />
        <Text style={styles.body}>נשלח לך תזכורת עדינה ביום שבו התפילה שלך מחכה — אפשר לכבות בכל רגע.</Text>

        <PrimaryButton
          label={requesting ? 'רגע...' : 'אפשר התראות'}
          onPress={handleAllow}
          disabled={requesting}
          variant="accent"
          glow
          style={styles.button}
        />
        <TextLinkButton label="לא תודה" onPress={handleDecline} />
      </View>
    </OnboardingScreenShell>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bellIcon: {
    marginBottom: -4,
  },
  eyebrow: {
    ...typography.eyebrow,
    textAlign: 'center',
  },
  title: {
    ...typography.hero,
    fontSize: 26,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  body: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  button: {
    marginTop: spacing.xxl,
    alignSelf: 'stretch',
  },
  });
}
