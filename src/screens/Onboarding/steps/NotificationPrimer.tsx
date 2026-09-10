import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Animated, { FadeIn } from 'react-native-reanimated';
import { FlameIcon } from '../../../components/FlameIcon';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { TextLinkButton } from '../../../components/TextLinkButton';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import { FocalLight } from '../motion/OnboardingLight';
import { WORLD } from '../motion/tokens';
import type { StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

// Content settles first, the button follows — spec's "content first, button
// second" rule for every onboarding scene.
const BUTTON_DELAY_MS = 550;

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
    <OnboardingScreenShell onBack={onBack} progress={progress} world={WORLD.notificationPrimer}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <FocalLight size={140} tone="warm" peakOpacity={0.24} revealDurationMs={700} style={styles.iconGlow} />
          <Ionicons name="notifications" size={40} color={colors.accentDark} style={styles.bellIcon} />
          <FlameIcon size={28} />
        </View>

        <Text style={styles.eyebrow}>רגע אחרון</Text>
        <HighlightText text="אל תפספסו את **הרגע שלכם**" style={styles.title} />
        <Text style={styles.body}>נשלח לך תזכורת עדינה ביום שבו התפילה שלך מחכה — אפשר לכבות בכל רגע.</Text>

        <Animated.View entering={FadeIn.delay(BUTTON_DELAY_MS).duration(400)} style={styles.buttonWrap}>
          <PrimaryButton
            label={requesting ? 'רגע...' : 'אפשר התראות'}
            onPress={handleAllow}
            disabled={requesting}
            variant="accent"
            glow
            style={styles.button}
          />
          <TextLinkButton label="לא תודה" onPress={handleDecline} />
        </Animated.View>
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
  iconGlow: {
    position: 'absolute',
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
  buttonWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  button: {
    alignSelf: 'stretch',
  },
  });
}
