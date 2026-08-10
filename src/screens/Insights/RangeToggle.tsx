import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TrendRange } from '../../data/storage/db';
import { colors, spacing, typography } from '../../theme';

const RANGES: TrendRange[] = ['7D', '30D', '3M', '1Y'];

interface RangeToggleProps {
  value: TrendRange;
  onChange: (range: TrendRange) => void;
}

export function RangeToggle({ value, onChange }: RangeToggleProps) {
  return (
    <View style={styles.container}>
      {RANGES.map((range) => {
        const isActive = range === value;
        return (
          <Pressable
            key={range}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(range)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{range}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 16,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    ...typography.caption,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.background,
  },
});