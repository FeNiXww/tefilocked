import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TERMS_TEXT } from '../../legal/legalText';
import { billingSummary, type SubscriptionPlan } from '../../subscriptions/pricing';
import { TRIAL_LENGTH_DAYS } from '../../subscriptions/trialConfig';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../theme';
import { PlanOptionCard } from './PlanOptionCard';

interface PlanScreenProps {
  selectedPlan: SubscriptionPlan;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  busy: boolean;
  onConfirm: () => void;
  error?: string | null;
}

interface TimelineStep {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
}

const TIMELINE: TimelineStep[] = [
  { icon: 'lock-open-outline', label: 'היום', detail: 'גישה מלאה לכל התכונות' },
  {
    icon: 'notifications-outline',
    label: `יום ${TRIAL_LENGTH_DAYS - 1}`,
    detail: 'נזכיר לך שהניסיון עומד להסתיים',
  },
  { icon: 'card-outline', label: `יום ${TRIAL_LENGTH_DAYS}`, detail: 'החיוב הראשון, אלא אם ביטלת' },
];

/** Third and final paywall screen — the trial timeline, the actual plan choice, and the real CTA. */
export function PlanScreen({ selectedPlan, onSelectPlan, busy, onConfirm, error }: PlanScreenProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [termsVisible, setTermsVisible] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{`${TRIAL_LENGTH_DAYS} ימים בחינם, ואז בוחרים`}</Text>

      <View style={styles.timeline}>
        {TIMELINE.map((step) => (
          <View key={step.label} style={styles.timelineRow}>
            <View style={styles.timelineIconWrap}>
              {/* `timelineIconWrap`'s `accentLight` fill is a fixed light
                  tone in both themes (see colors.ts), so the icon is fixed
                  to match — `colors.accentDark` would turn light pastel-blue
                  in dark mode against this always-light circle. */}
              <Ionicons name={step.icon} size={18} color={lightColors.accentDark} />
            </View>
            <View style={styles.timelineText}>
              <Text style={styles.timelineLabel}>{step.label}</Text>
              <Text style={styles.timelineDetail}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.plans}>
        <PlanOptionCard plan="yearly" selected={selectedPlan === 'yearly'} onSelect={onSelectPlan} />
        <PlanOptionCard plan="monthly" selected={selectedPlan === 'monthly'} onSelect={onSelectPlan} />
      </View>

      <PrimaryButton
        label={busy ? 'רגע...' : `התחל ${TRIAL_LENGTH_DAYS} ימים בחינם`}
        onPress={onConfirm}
        disabled={busy}
        variant="accent"
        glow
        style={styles.ctaButton}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Text style={styles.billingSummary}>{billingSummary(selectedPlan)}</Text>
      <Text style={styles.trustRow}>ניתן לבטל בכל עת לפני תום הניסיון, ללא חיוב</Text>
      <Text style={styles.footer}>
        <Text style={styles.footerLink} onPress={() => setTermsVisible(true)}>
          תנאי שימוש
        </Text>
        {' · המחירים כוללים מע״מ'}
      </Text>

      <Modal visible={termsVisible} animationType="slide" onRequestClose={() => setTermsVisible(false)}>
        <View style={[styles.termsHeader, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.termsTitle}>תנאי שימוש</Text>
          <Pressable onPress={() => setTermsVisible(false)} hitSlop={12} accessibilityLabel="סגירה">
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.termsBody}
          contentContainerStyle={[styles.termsContent, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          <Text style={styles.termsText}>{TERMS_TEXT}</Text>
        </ScrollView>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: 18,
    alignSelf: 'stretch',
    textAlign: 'right',
  },
  timeline: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineText: {
    flex: 1,
    gap: 1,
  },
  timelineLabel: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  timelineDetail: {
    ...typography.caption,
    textAlign: 'right',
  },
  plans: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  ctaButton: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  billingSummary: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.danger,
    textAlign: 'center',
  },
  trustRow: {
    ...typography.caption,
    textAlign: 'center',
  },
  footer: {
    ...typography.caption,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.textPrimary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  termsHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  termsTitle: {
    ...typography.heading,
  },
  termsBody: {
    flex: 1,
    backgroundColor: colors.background,
  },
  termsContent: {
    padding: spacing.xl,
  },
  termsText: {
    ...typography.body,
    textAlign: 'right',
    lineHeight: 24,
  },
  });
}
