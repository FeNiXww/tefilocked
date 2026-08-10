import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SparkleBackground } from '../../components/SparkleBackground';
import { getOfferings, purchasePackage, restorePurchases } from '../../subscriptions/revenueCatConfig';
import { scheduleTrialEndingReminder } from '../../subscriptions/trialReminder';
import { colors, spacing, typography } from '../../theme';
import { FeatureList } from './FeatureList';
import { TrialTimeline } from './TrialTimeline';

interface DisplayPackage {
  identifier: string;
  title: string;
  priceString: string;
}

// Shown only when RevenueCat itself is unreachable (Expo Go, or offerings
// not configured yet) so the Paywall UI/flow can still be previewed.
const PREVIEW_PACKAGES: DisplayPackage[] = [
  { identifier: 'preview-monthly', title: 'חודשי', priceString: '₪9.99 / חודש' },
  { identifier: 'preview-annual', title: 'שנתי', priceString: '₪74.90 / שנה' },
];

const isAnnual = (title: string) => title.includes('שנתי') || title.toLowerCase().includes('annual') || title.toLowerCase().includes('year');

interface PaywallProps {
  onPurchased: () => void;
}

export function Paywall({ onPurchased }: PaywallProps) {
  const [realPackages, setRealPackages] = useState<PurchasesPackage[] | null>(null);
  const [displayPackages, setDisplayPackages] = useState<DisplayPackage[] | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrance = useSharedValue(0);

  useEffect(() => {
    entrance.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [entrance]);

  useEffect(() => {
    getOfferings()
      .then((offerings) => {
        const available = offerings.current?.availablePackages ?? [];
        setRealPackages(available);
        setDisplayPackages(
          available.map((p) => ({ identifier: p.identifier, title: p.product.title, priceString: p.product.priceString }))
        );
        setSelectedId(available[0]?.identifier ?? null);
      })
      .catch(() => {
        // RevenueCat unavailable (e.g. Expo Go, or offerings not configured
        // yet) — fall back to a preview so the screen/flow is still reviewable.
        setPreviewMode(true);
        setDisplayPackages(PREVIEW_PACKAGES);
        setSelectedId(PREVIEW_PACKAGES[0].identifier);
      });
  }, []);

  const handlePurchase = async () => {
    if (previewMode) {
      onPurchased();
      return;
    }
    const pkg = realPackages?.find((p) => p.identifier === selectedId);
    if (!pkg) return;
    setBusy(true);
    try {
      const active = await purchasePackage(pkg);
      if (active) {
        scheduleTrialEndingReminder().catch(() => {});
        onPurchased();
      }
    } catch {
      setError('הרכישה לא הושלמה, נסה שוב');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (previewMode) return;
    setBusy(true);
    try {
      const active = await restorePurchases();
      if (active) onPurchased();
      else setError('לא נמצא מנוי פעיל לשחזור');
    } catch {
      setError('השחזור נכשל, נסה שוב');
    } finally {
      setBusy(false);
    }
  };

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 16 }],
  }));

  return (
    <View style={styles.container}>
      <SparkleBackground tone="accent" starCount={10} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.animatedContent, entranceStyle]}>
          <Logo variant="mark" size={64} />

          <View style={styles.badge}>
            <Text style={styles.badgeText}>7 ימי ניסיון חינם</Text>
          </View>

          <Text style={styles.title}>הפוך את הרגע שלפני הגלילה לרגע של חיבור</Text>
          <Text style={styles.subtitle}>כל מה שצריך כדי לשים את ה׳ במרכז, בלי הגבלה</Text>
          {previewMode && <Text style={styles.previewBadge}>תצוגה מקדימה — ללא חיוב אמיתי</Text>}

          <FeatureList />

          <View style={styles.divider} />

          <TrialTimeline />
          <Text style={styles.reminderNote}>נזכיר לך יום לפני החיוב הראשון — אפשר לבטל בכל עת עד אז, בלי שום חיוב.</Text>

          {displayPackages === null && <ActivityIndicator color={colors.primary} style={styles.loader} />}
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.packages}>
            {displayPackages?.map((pkg) => {
              const isSelected = pkg.identifier === selectedId;
              const annual = isAnnual(pkg.title);
              return (
                <Pressable
                  key={pkg.identifier}
                  style={[styles.packageRow, isSelected && styles.packageRowSelected]}
                  onPress={() => setSelectedId(pkg.identifier)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${pkg.title}, ${pkg.priceString}`}
                >
                  {annual && (
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueText}>הכי משתלם</Text>
                    </View>
                  )}
                  <View style={styles.packageInfo}>
                    <Text style={[styles.packageTitle, isSelected && styles.packageTitleSelected]}>{pkg.title}</Text>
                    <Text style={[styles.packagePrice, isSelected && styles.packageTitleSelected]}>{pkg.priceString}</Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <PrimaryButton
            label={busy ? 'רגע...' : 'התחל ניסיון חינם'}
            onPress={handlePurchase}
            disabled={busy || !selectedId}
            variant="accent"
            glow
            style={styles.purchaseButton}
          />

          <Text style={styles.trustRow}>ביטול בכל עת · ללא התחייבות</Text>

          {!previewMode && (
            <Pressable onPress={handleRestore} disabled={busy}>
              <Text style={styles.restoreText}>שחזר רכישות</Text>
            </Pressable>
          )}

          <Text style={styles.footer}>תנאי שימוש</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  animatedContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    backgroundColor: colors.accentLight,
    borderRadius: 20,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  badgeText: {
    ...typography.eyebrow,
    letterSpacing: 0.5,
  },
  title: {
    ...typography.hero,
    fontSize: 24,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  previewBadge: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: spacing.xs,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  reminderNote: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  error: {
    ...typography.bodySecondary,
    color: colors.danger,
    textAlign: 'center',
  },
  packages: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  packageRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packageRowSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background,
  },
  packageInfo: {
    gap: 2,
  },
  packageTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  packageTitleSelected: {
    color: colors.primary,
  },
  packagePrice: {
    ...typography.body,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.accent,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  purchaseButton: {
    marginTop: spacing.md,
  },
  trustRow: {
    ...typography.caption,
  },
  restoreText: {
    ...typography.bodySecondary,
    textDecorationLine: 'underline',
    marginTop: spacing.sm,
  },
  footer: {
    ...typography.caption,
    marginTop: spacing.xl,
  },
});
