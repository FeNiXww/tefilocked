import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { ContentItem, ContentKind } from '../../content/types';
import { resolveVerses } from '../../content/calendarVariants';
import { buildEligibilityContext, evaluateLiturgicalEligibility, resolveDiasporaOrIsrael } from '../../content/liturgicalEligibility';
import { getCachedZmanimLocation, hasZmanimLocationBeenDenied, requestZmanimLocation } from '../../native/location';
import { getUserRegion } from '../../data/storage/mmkv';
import { getDevForcedNow } from '../../dev/devTimeOverride';
import { PrimaryButton } from '../../components/PrimaryButton';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';
import { VerseReader } from './VerseReader';

interface ContentDisplayProps {
  content: ContentItem;
  onContinue: () => void;
  continuing: boolean;
  continueLabel?: string;
}

const KIND_LABELS: Record<ContentKind, string> = {
  psalm: 'תהילים',
  prayer: 'תפילה מסורתית',
  biblical_song: 'קטע מקראי',
  wisdom: 'מתורת חז״ל',
  reflection: 'מחשבה אישית',
  personal: 'תפילה אישית',
};

/**
 * The full-text reading screen — a small siddur, not a card. Traditional
 * sources (`isTraditional: true`) are shown complete, verse by verse, via
 * VerseReader; "continue" only unlocks once the user has actually scrolled
 * through the whole thing (see VerseReader's onReachEnd), never on a timer.
 */
export function ContentDisplay({ content, onContinue, continuing, continueLabel }: ContentDisplayProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [readyToContinue, setReadyToContinue] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  // Bumped after a location request resolves (granted or not) so the
  // eligibility recomputation below picks up the fresh (or still-absent)
  // cached location — `evaluateLiturgicalEligibility` itself never fetches
  // location on its own, so something has to signal "check again."
  const [locationVersion, setLocationVersion] = useState(0);
  const [locationRequesting, setLocationRequesting] = useState(false);
  const buttonAnim = useSharedValue(0);

  // Computed once per item/location-change (not on every render) — the same
  // Liturgical Eligibility Engine call that already decided whether this
  // item was even allowed into the random pool (see content/index.ts +
  // poolSafety.ts) also powers what's shown here, so the gate and the
  // explanation can never tell two different stories. Reads whatever zmanim
  // location is already cached — never triggers a permission request from
  // a render; that only happens via the explicit button below.
  const eligibility = useMemo(
    () =>
      evaluateLiturgicalEligibility(
        content,
        buildEligibilityContext(getDevForcedNow(), getCachedZmanimLocation(), resolveDiasporaOrIsrael(getUserRegion()))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content, locationVersion]
  );
  const guidanceDetails = eligibility.requirements;
  const captionText = eligibility.reason || content.liturgicalContext?.serviceRole;

  // Offer the location-based accurate-timing flow only where it could
  // actually change anything: a real halachic zman, no cached location yet,
  // and not already declined (re-asking after a "no" belongs in Settings,
  // not repeated on every reading screen — see native/location.ts).
  const canOfferAccurateTiming =
    !!content.liturgicalContext?.timeContext.hasRealHalachicZman &&
    !getCachedZmanimLocation() &&
    !hasZmanimLocationBeenDenied();

  const handleRequestLocation = async () => {
    setLocationRequesting(true);
    await requestZmanimLocation();
    setLocationRequesting(false);
    setLocationVersion((v) => v + 1);
  };

  // A new content item means the reading gate must re-lock, and any
  // previously-opened "why?" panel must close — it belongs to the old item.
  useEffect(() => {
    setReadyToContinue(false);
    setShowGuidance(false);
    buttonAnim.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.id]);

  useEffect(() => {
    if (!readyToContinue) return;
    buttonAnim.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.4)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToContinue]);

  const canContinue = readyToContinue && !continuing;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + buttonAnim.value * 0.65,
    transform: [{ scale: 0.9 + buttonAnim.value * 0.1 }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kindBadge}>{KIND_LABELS[content.kind]}</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.source}>{content.source}</Text>
        {captionText ? <Text style={styles.context}>{captionText}</Text> : null}
        {canOfferAccurateTiming ? (
          <Pressable onPress={handleRequestLocation} disabled={locationRequesting} hitSlop={8}>
            <Text style={styles.locationLink}>
              {locationRequesting ? 'מחשב...' : 'חשב זמני תפילה מדויקים לפי המיקום שלך'}
            </Text>
          </Pressable>
        ) : null}
        {guidanceDetails.length > 0 ? (
          <Pressable onPress={() => setShowGuidance((v) => !v)} hitSlop={8}>
            <Text style={styles.whyLink}>{showGuidance ? 'סגור' : 'למה?'}</Text>
          </Pressable>
        ) : null}
        {showGuidance ? (
          // Bounded + internally scrollable: `header` isn't itself inside a
          // ScrollView (VerseReader owns the page's scroll, for its own
          // reached-the-end tracking), so an unbounded panel here can grow
          // past the screen and get clipped by the physical viewport rather
          // than just overflowing visibly — a real device-testing finding,
          // not a hypothetical.
          <ScrollView
            style={styles.guidancePanel}
            contentContainerStyle={styles.guidancePanelContent}
            nestedScrollEnabled
          >
            {guidanceDetails.map((detail) => (
              <View key={detail.label} style={styles.guidanceRow}>
                <Text style={styles.guidanceLabel}>{detail.label}</Text>
                <Text style={styles.guidanceText}>{detail.text}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <VerseReader verses={resolveVerses(content)} onReachEnd={() => setReadyToContinue(true)} />

      <Animated.View style={[styles.buttonWrap, animatedStyle]}>
        <PrimaryButton
          label={continuing ? 'רגע...' : (continueLabel ?? 'המשך')}
          onPress={onContinue}
          disabled={!canContinue}
        />
      </Animated.View>
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  kindBadge: {
    ...typography.eyebrow,
  },
  title: {
    ...typography.readingTitle,
  },
  source: {
    ...typography.readingSource,
  },
  context: {
    ...typography.caption,
    textAlign: 'center',
  },
  whyLink: {
    ...typography.caption,
    color: colors.accentDark,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  locationLink: {
    ...typography.caption,
    color: colors.accentDark,
    textDecorationLine: 'underline',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  // A plain theme-reactive card (like every other card on this screen)
  // rather than the fixed-light `primaryLight` tried earlier — that stayed a
  // bright white box against dark mode's dark background, which read as
  // jarring even once its text was readable.
  guidancePanel: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    maxHeight: 220,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guidancePanelContent: {
    padding: spacing.md,
  },
  guidanceRow: {
    gap: 2,
    marginBottom: spacing.sm,
  },
  guidanceLabel: {
    ...typography.caption,
    color: colors.accentDark,
    fontWeight: '700',
    textAlign: 'right',
  },
  guidanceText: {
    ...typography.bodySecondary,
    textAlign: 'right',
  },
  buttonWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  });
}
