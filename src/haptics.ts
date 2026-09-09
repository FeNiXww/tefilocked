import * as Haptics from 'expo-haptics';

/**
 * Single place every interactive element in the app reaches for haptic
 * feedback — keeps the intensity/variant choices consistent (a selection
 * always feels the same everywhere) and the `.catch(() => {})` guard (some
 * Android devices have no haptic actuator, or the user disabled system
 * haptics — either way this must never throw) written once instead of at
 * every call site.
 */
export const haptics = {
  /** Picking an option in a list of choices (radio cards, plan cards, toggles). */
  selection: () => Haptics.selectionAsync().catch(() => {}),
  /** Everyday taps — primary buttons, minor confirmations. */
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** A slightly weightier action — granting a permission, a settings change with real effect. */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  /** Reserved for rare, high-weight moments (e.g. a big streak milestone). */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
  /** A completed, successful outcome — commitment confirmed, permission flow finished. */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  /** A setback the user should notice but that isn't an error — e.g. a broken streak. */
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
