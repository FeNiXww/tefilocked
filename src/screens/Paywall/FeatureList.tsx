import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors, spacing, typography } from '../../theme';

const FEATURES = [
  'נעילת אפליקציות מסיחות עד שתתפלל',
  'ספריית תפילות ותהלים בעברית',
  'תוכן מותאם אישית למצב הרוח שלך',
  'רצפי תפילה ומעקב התקדמות',
  'תובנות רוחניות אישיות',
];

function FeatureRow({ text, index }: { text: string; index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 90,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: (1 - progress.value) * (spacing.lg * -1) }],
  }));

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

export function FeatureList() {
  return (
    <View style={styles.container}>
      {FEATURES.map((text, index) => (
        <FeatureRow key={text} text={text} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    ...typography.body,
    flex: 1,
    textAlign: 'right',
  },
});
