import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

// Previously showed fabricated star ratings, review counts, and named
// testimonials — this app has no real users/reviews yet, and shipping
// fabricated ones risks Apple Guideline 2.3.1 ("Accurate Metadata") and the
// equivalent Play Store policy. Replaced with genuine, unattributed value
// statements instead of removing the "why trust this" beat entirely.
const VALUES = [
  { icon: '🙏', text: 'לא צריך לדעת מה לומר — כל יום מקבלים תפילה שמתאימה בדיוק לרגע שלכם.' },
  { icon: '🔒', text: 'נעילה היא לא עונש. היא רגע קטן לעצור לפני שממשיכים הלאה.' },
  { icon: '🔥', text: 'רצף נבנה יום אחרי יום — לא הישג חד פעמי, אלא הרגל שנשאר.' },
];

export function TestimonialsBlock() {
  return (
    <View style={styles.container}>
      {VALUES.map((value) => (
        <View key={value.text} style={styles.card}>
          <Text style={styles.icon}>{value.icon}</Text>
          <Text style={styles.quote}>{value.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  icon: {
    fontSize: 22,
  },
  quote: {
    ...typography.bodySecondary,
    flex: 1,
    textAlign: 'right',
  },
});
