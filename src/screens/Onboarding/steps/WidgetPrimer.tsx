import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isPinWidgetSupportedAndroid, requestPinWidgetAndroid } from '../../../../modules/streak-widget';
import { FlameIcon } from '../../../components/FlameIcon';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { TextLinkButton } from '../../../components/TextLinkButton';
import { haptics } from '../../../haptics';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import type { StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

const IOS_STEPS = [
  'החזיקו אצבע על מסך הבית עד שהאייקונים מתחילים לרעוד',
  'הקישו על + בפינה העליונה',
  'חפשו את תפילוק ובחרו את הווידג׳ט',
];

/**
 * Last onboarding beat before the paywall — tells the user the streak
 * widget exists and lets them place it right away. Android fires the
 * launcher's native pin-request prompt directly; iOS has no such API, so it
 * shows the same manual walkthrough as the Settings row (see AddWidgetRow).
 * Never blocks onboarding: whatever the user does here, onNext moves on.
 */
export function WidgetPrimer({ onNext, onBack, progress }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [pinSupported] = useState(() => Platform.OS === 'android' && isPinWidgetSupportedAndroid());

  const handleAddWidget = () => {
    haptics.light();
    requestPinWidgetAndroid();
    onNext();
  };

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress} tone="accent">
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="grid" size={36} color={colors.accentDark} />
          <FlameIcon size={28} />
        </View>

        <Text style={styles.eyebrow}>עוד דבר אחד</Text>
        <HighlightText text="**הרצף שלך**, על מסך הבית" style={styles.title} />
        <Text style={styles.body}>
          הוסיפו את הווידג׳ט של תפילוק למסך הבית כדי לראות את הרצף שלכם בכל רגע — בלי לפתוח את האפליקציה.
        </Text>

        {!pinSupported && (
          <View style={styles.stepsCard}>
            {IOS_STEPS.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        <PrimaryButton
          label={pinSupported ? 'הוספת הווידג׳ט' : 'המשך'}
          onPress={pinSupported ? handleAddWidget : onNext}
          variant="accent"
          glow
          style={styles.button}
        />
        {pinSupported && <TextLinkButton label="לא תודה" onPress={onNext} />}
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
  stepsCard: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  stepRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `accentLight` is a fixed light tone in both themes (see colors.ts), so
  // this text is fixed to match rather than pulled from the theme, which
  // would otherwise hand dark mode its light pastel-blue `accentDark`
  // (meant for text on a dark background) against this always-light badge.
  stepBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: lightColors.accentDark,
  },
  stepText: {
    ...typography.caption,
    flex: 1,
    textAlign: 'right',
  },
  button: {
    marginTop: spacing.xxl,
    alignSelf: 'stretch',
  },
  });
}
