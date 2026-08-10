import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EmojiRatingSlider } from '../../components/EmojiRatingSlider';
import { PrimaryButton } from '../../components/PrimaryButton';
import { spacing, typography } from '../../theme';
import { CONNECTION_BUCKETS } from './connectionLabels';

interface ConnectionCheckInProps {
  onSubmit: (rating: number) => void;
}

export function ConnectionCheckIn({ onSubmit }: ConnectionCheckInProps) {
  const [rating, setRating] = useState(3);

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>איך הקשר שלך עם ה׳ היום?</Text>
      <EmojiRatingSlider buckets={CONNECTION_BUCKETS} initialValue={rating} onValueChange={setRating} />
      <PrimaryButton label="המשך" onPress={() => onSubmit(rating)} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xl,
  },
  prompt: {
    ...typography.heading,
  },
  button: {
    marginTop: spacing.md,
  },
});