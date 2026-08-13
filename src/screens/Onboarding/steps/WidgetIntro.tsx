import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { MagenDavidStreak } from '../../../components/MagenDavidStreak';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SparkleBackground } from '../../../components/SparkleBackground';
import { getCurrentStreak, getStreakCandles, hasCompletedToday } from '../../../data/storage/db';
import { isPinWidgetSupportedAndroid, requestPinWidgetAndroid } from '../../../../modules/streak-widget';
import { syncStreakWidget } from '../../../widgets/syncStreakWidget';
import { colors, spacing, typography } from '../../../theme';
import { pickG, type StepComponentProps } from '../onboardingState';

const IOS_STEPS = [
  'החזיקו אצבע על מסך הבית עד שהאייקונים מתחילים לרעוד',
  'הקישו על + בפינה העליונה',
  'חפשו את תפילוק ובחרו את הווידג׳ט',
];

/**
 * Shows the home-screen widget and, on Android, lets the user place it right
 * from onboarding via the launcher's native pin-request prompt — iOS has no
 * equivalent API (Apple doesn't expose one), so that side gets a short
 * numbered walkthrough instead. Either way this never blocks onNext: adding
 * the widget is a nice-to-have, not a requirement to finish onboarding.
 */
export function WidgetIntro({ answers, onNext }: StepComponentProps) {
  const [streak] = useState(() => getCurrentStreak());
  const [litToday] = useState(() => hasCompletedToday());
  const [pinSupported, setPinSupported] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    // So the widget already shows real data the moment it's placed, instead
    // of the zeroed-out defaults a brand-new install would otherwise push.
    syncStreakWidget(streak, litToday, getStreakCandles().map((c) => c.completed));
    if (Platform.OS === 'android') {
      setPinSupported(isPinWidgetSupportedAndroid());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddWidget = () => {
    setRequested(requestPinWidgetAndroid());
  };

  return (
    <View style={styles.container}>
      <SparkleBackground tone="accent" starCount={8} />
      <Text style={styles.title}>הוסיפו את הווידג׳ט למסך הבית</Text>
      <Text style={styles.subtitle}>ראו את הרצף שלכם בכל פעם שאתם פותחים את הטלפון — בלי לפתוח את האפליקציה</Text>

      <View style={styles.widgetMock}>
        <MagenDavidStreak streak={streak || 1} litToday={litToday || streak === 0} size={72} />
        <View style={styles.widgetTextWrap}>
          <Text style={styles.widgetNumber}>{streak || 1}</Text>
          <Text style={styles.widgetLabel}>ימי רצף</Text>
        </View>
      </View>

      {Platform.OS === 'android' ? (
        pinSupported && !requested ? (
          <PrimaryButton label="הוסיפו את הווידג׳ט" onPress={handleAddWidget} variant="accent" style={styles.button} />
        ) : (
          <Text style={styles.confirmText}>
            {requested
              ? pickG(answers.gender, 'תוכל', 'תוכלי') + ' למצוא את הבקשה להוספה בראש המסך'
              : 'ניתן להוסיף את הווידג׳ט מאוחר יותר: החזיקו אצבע על מסך הבית ← ווידג׳טים ← תפילוק'}
          </Text>
        )
      ) : (
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

      <PrimaryButton label="המשך" onPress={onNext} style={styles.continueButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.hero,
    fontSize: 26,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
  },
  widgetMock: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    width: 180,
    paddingVertical: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  widgetTextWrap: {
    alignItems: 'center',
  },
  widgetNumber: {
    ...typography.title,
    fontSize: 28,
    color: colors.accentDark,
  },
  widgetLabel: {
    ...typography.caption,
    color: colors.accentDark,
  },
  button: {
    alignSelf: 'stretch',
  },
  confirmText: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  stepsCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accentDark,
  },
  stepText: {
    ...typography.bodySecondary,
    flex: 1,
    textAlign: 'right',
  },
  continueButton: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
