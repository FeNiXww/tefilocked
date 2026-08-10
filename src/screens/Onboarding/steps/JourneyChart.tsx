import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { TapToContinue } from '../TapToContinue';
import { colors, spacing, typography } from '../../../theme';
import type { StepComponentProps } from '../onboardingState';

const CHART_WIDTH = 280;
const CHART_HEIGHT = 140;

/** A small illustrative chart — the "prayer journey" line rising, a scattered "I'll pray later" line declining — reinforcing the reflection screens that came before it. Not user data; a motivational graphic, like the reference app's equivalent screen. */
function JourneyChartIllustration() {
  return (
    <View style={styles.chartCard}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendLabel}>מסע התפילה שלך</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendX}>✕</Text>
          <Text style={styles.legendLabel}>תפילה שדולגה</Text>
        </View>
      </View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        <Path
          d="M10,110 C60,100 80,60 130,55 C180,50 200,90 230,80 C250,73 260,40 270,20"
          stroke={colors.accent}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M10,70 C40,80 55,95 75,100 C95,105 110,120 130,125"
          stroke={colors.danger}
          strokeWidth={2}
          strokeDasharray="4,5"
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx={270} cy={20} r={5} fill={colors.accent} />
        {[30, 55, 80, 105, 130].map((x, i) => (
          <Circle key={x} cx={x} cy={70 + i * 14} r={3} fill={colors.danger} />
        ))}
      </Svg>
    </View>
  );
}

export function JourneyChart({ onNext }: StepComponentProps) {
  return (
    <TapToContinue variant="light" headline="תפילה היא כוח" onNext={onNext}>
      <JourneyChartIllustration />
      <Text style={styles.quote}>
        {'המשיכו לדבר איתו. ככל שתופיעו יותר, כך תיתנו יותר מקום לקדוש ברוך הוא להופיע בחייכם.'}
      </Text>
    </TapToContinue>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  legendRow: {
    flexDirection: 'row-reverse',
    gap: spacing.lg,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendX: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  legendLabel: {
    ...typography.caption,
  },
  quote: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 24,
  },
});
