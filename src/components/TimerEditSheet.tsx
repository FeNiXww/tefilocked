import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../haptics';
import Slider from '@react-native-community/slider';
import { PrimaryButton } from './PrimaryButton';
import { formatRemaining } from './UnlockCountdown';
import { DURATION_PRESETS } from '../native/appLocking/durationPresets';
import { useTheme, type ThemeColors, type Spacing, type Typography } from '../theme';

interface TimerEditSheetProps {
  visible: boolean;
  remainingSeconds: number;
  onClose: () => void;
  onSelectDuration: (minutes: number) => void;
  onReset: () => void;
}

/**
 * Bottom sheet for editing the SAME grant the Home countdown displays and
 * the post-prayer flow creates — see useUnlockTimer, the single read/write
 * surface both this sheet and the Home screen consume. Fixed presets apply
 * immediately (fast tap → sheet closes); the custom slider needs an explicit
 * confirm since a drag has no natural "done" moment.
 */
export function TimerEditSheet({ visible, remainingSeconds, onClose, onSelectDuration, onReset }: TimerEditSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography } = useTheme();
  const styles = createStyles(colors, spacing, typography);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [editingCustom, setEditingCustom] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (!visible) {
      setEditingCustom(false);
      setConfirmingReset(false);
    }
  }, [visible]);

  const activePresetId = useMemo(() => {
    if (remainingSeconds <= 0) return null;
    const remainingMinutes = remainingSeconds / 60;
    let closest: string | null = null;
    let closestDiff = Infinity;
    for (const option of DURATION_PRESETS) {
      if (option.minutes <= 0) continue;
      const diff = Math.abs(option.minutes - remainingMinutes);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = option.id;
      }
    }
    return closest;
  }, [remainingSeconds]);

  const handlePickPreset = (option: (typeof DURATION_PRESETS)[number]) => {
    if (option.id === 'custom') {
      haptics.selection();
      setEditingCustom(true);
      return;
    }
    haptics.selection();
    onSelectDuration(option.minutes);
  };

  const handleConfirmCustom = () => {
    onSelectDuration(customMinutes);
  };

  const handleResetPress = () => {
    haptics.selection();
    setConfirmingReset(true);
  };

  const handleConfirmReset = () => {
    haptics.medium();
    onReset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="סגירה" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />

        <Text style={styles.title}>עריכת טיימר הנעילה</Text>
        <Text style={styles.subtitle}>
          {remainingSeconds > 0
            ? `כרגע נותרו ${formatRemaining(remainingSeconds)}`
            : 'אין זמן פתוח כרגע — האפליקציות נעולות'}
        </Text>

        <View style={styles.options}>
          {DURATION_PRESETS.map((option) => {
            const isSelected = option.id === 'custom' ? editingCustom : option.id === activePresetId;
            return (
              <Pressable
                key={option.id}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => handlePickPreset(option)}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {editingCustom && (
          <View style={styles.customWrap}>
            <Text style={styles.customValue}>{customMinutes} דקות</Text>
            <Slider
              style={styles.slider}
              minimumValue={5}
              maximumValue={180}
              step={5}
              value={customMinutes}
              onValueChange={setCustomMinutes}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.surfacePressed}
              thumbTintColor={colors.primary}
            />
            <PrimaryButton label="אישור" onPress={handleConfirmCustom} style={styles.customButton} />
          </View>
        )}

        <View style={styles.resetZone}>
          {!confirmingReset ? (
            <Pressable onPress={handleResetPress} style={styles.resetButton} accessibilityLabel="אפס טיימר">
              <Text style={styles.resetLabel}>אפס טיימר</Text>
            </Pressable>
          ) : (
            <View style={styles.resetConfirm}>
              <Text style={styles.resetConfirmLabel}>לאפס את הטיימר?</Text>
              <View style={styles.resetConfirmButtons}>
                <Pressable onPress={() => setConfirmingReset(false)} style={styles.resetCancelButton}>
                  <Text style={styles.resetCancelLabel}>ביטול</Text>
                </Pressable>
                <Pressable onPress={handleConfirmReset} style={styles.resetConfirmButton}>
                  <Text style={styles.resetConfirmButtonLabel}>איפוס</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, spacing: Spacing, typography: Typography) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 25, 40, 0.45)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  title: {
    ...typography.heading,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  options: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  optionLabel: {
    ...typography.body,
  },
  optionLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  customWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
  },
  customValue: {
    ...typography.heading,
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  customButton: {
    marginTop: spacing.xs,
  },
  resetZone: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  resetButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  resetLabel: {
    ...typography.bodySecondary,
    color: colors.danger,
    fontWeight: '600',
  },
  resetConfirm: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  resetConfirmLabel: {
    ...typography.bodySecondary,
    color: colors.textPrimary,
  },
  resetConfirmButtons: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
  },
  resetCancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  resetCancelLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  resetConfirmButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 20,
    backgroundColor: colors.danger,
  },
  resetConfirmButtonLabel: {
    ...typography.body,
    color: colors.background,
    fontWeight: '700',
  },
  });
}
