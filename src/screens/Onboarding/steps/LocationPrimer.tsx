import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { requestZmanimLocation } from '../../../native/location';
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
 * A custom explanation screen shown BEFORE the real location permission
 * prompt — so the system dialog never appears out of nowhere. This is the
 * ONE ask for zmanim location (see src/native/location.ts): without it, the
 * app falls back to a plain calendar-day approximation for Shabbat/Yom Tov
 * (see shabbatWindow.ts) and fully hides real-halachic-time-dependent
 * content like Shema (see liturgicalEligibility.ts's LOCATION_REQUIRED
 * status) rather than guessing. Never blocks onboarding: whatever the user
 * answers, onNext fires right after — same pattern as NotificationPrimer.
 */
export function LocationPrimer({ update, onNext, onBack, progress }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const result = await requestZmanimLocation();
      update({ locationEnabled: result.status === 'granted' });
    } catch {
      update({ locationEnabled: false });
    } finally {
      onNext();
    }
  };

  const handleDecline = () => {
    if (requesting) return;
    update({ locationEnabled: false });
    onNext();
  };

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress} world={WORLD.locationPrimer}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <FocalLight size={140} tone="warm" peakOpacity={0.24} revealDurationMs={700} style={styles.iconGlow} />
          <Ionicons name="location" size={40} color={colors.accentDark} style={styles.pinIcon} />
          <FlameIcon size={28} />
        </View>

        <Text style={styles.eyebrow}>לדיוק מרבי</Text>
        <HighlightText text="כדי שהזמנים יהיו **מדויקים בשבילכם**" style={styles.title} />
        <Text style={styles.body}>
          המיקום שלכם עוזר לחשב בדיוק מתי שבת וחג מתחילים ומסתיימים אצלכם, ומתי הזמן לקריאת שמע — בלי לנחש.
        </Text>

        <Animated.View entering={FadeIn.delay(BUTTON_DELAY_MS).duration(400)} style={styles.buttonWrap}>
          <PrimaryButton
            label={requesting ? 'רגע...' : 'אפשר מיקום'}
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
  pinIcon: {
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
