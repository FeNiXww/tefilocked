export interface DurationOption {
  id: string;
  label: string;
  minutes: number;
}

/**
 * Preset unlock durations — shared by the post-prayer duration picker and
 * the Home screen's timer editor so both read from the single list of "how
 * long to open the apps" choices in the app. `minutes: -1` marks the
 * custom/slider option.
 */
export const DURATION_PRESETS: DurationOption[] = [
  { id: '15min', label: '15 דקות', minutes: 15 },
  { id: '30min', label: '30 דקות', minutes: 30 },
  { id: '1hour', label: 'שעה', minutes: 60 },
  { id: '3hours', label: '3 שעות', minutes: 180 },
  { id: '24hours', label: '24 שעות', minutes: 1440 },
  { id: 'custom', label: 'מותאם אישית', minutes: -1 },
];
