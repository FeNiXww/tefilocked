import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAndroidInstalledApps, getAndroidLockedApps, setAndroidLockedApps } from '../../../native/appLocking';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { pickG, type StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';
import { AppListRow } from '../../LockList/AppListRow';

interface AndroidApp {
  packageName: string;
  name: string;
  iconBase64?: string | null;
}

// Surfaced first, in this order, when installed — the apps most onboarding
// users are actually here for. Everything else is still fully selectable,
// just sorted alphabetically below these.
const POPULAR_PACKAGES = [
  'com.zhiliaoapp.musically', // TikTok
  'com.instagram.android',
  'com.google.android.youtube',
  'com.twitter.android', // X
  'com.snapchat.android',
  'com.facebook.katana',
];

function sortWithPopularFirst(apps: AndroidApp[]): AndroidApp[] {
  const popularRank = new Map(POPULAR_PACKAGES.map((pkg, index) => [pkg, index]));
  return [...apps].sort((a, b) => {
    const rankA = popularRank.get(a.packageName) ?? Infinity;
    const rankB = popularRank.get(b.packageName) ?? Infinity;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name, 'he');
  });
}

/**
 * Onboarding's app-selection beat — a simple, card-based picker rather than
 * a settings-page list. Writes go straight through the same
 * setAndroidLockedApps/getAndroidInstalledApps API Settings' own app list
 * uses, so a selection made here is real, not a preview. Android only: iOS
 * uses a native FamilyActivityPickerView that doesn't fit this list-row UI,
 * so iOS keeps deferring app selection to the first Home visit.
 */
export function AppSelectionStep({ answers, onNext, onBack, progress }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [apps, setApps] = useState<AndroidApp[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    getAndroidInstalledApps()
      .then((installed) => {
        setApps(sortWithPopularFirst(installed));
        setSelected(new Set(getAndroidLockedApps()));
      })
      .catch((error) => {
        console.warn('[tefillok] Failed to load installed apps:', error);
        setApps([]);
      });
  }, []);

  const filteredApps = useMemo(() => {
    if (!apps) return [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return apps;
    return apps.filter((app) => app.name.toLowerCase().includes(trimmed));
  }, [apps, query]);

  const toggle = (packageName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(packageName)) next.delete(packageName);
      else next.add(packageName);
      return next;
    });
  };

  const allSelected = apps !== null && apps.length > 0 && selected.size === apps.length;

  const toggleAll = () => {
    if (!apps) return;
    setSelected(allSelected ? new Set() : new Set(apps.map((app) => app.packageName)));
  };

  const handleContinue = () => {
    setAndroidLockedApps(Array.from(selected));
    onNext();
  };

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress} scroll={false}>
      <View style={styles.container}>
        <Text style={styles.title}>{`על מה ${pickG(answers.gender, 'אתה רוצה', 'את רוצה')} לשמור?`}</Text>
        <Text style={styles.subtitle}>
          {selected.size > 0
            ? `${selected.size} אפליקציות נבחרו`
            : `${pickG(answers.gender, 'בחר', 'בחרי')} את האפליקציות שתפילוק תעצור אותך לפני שהן נפתחות`}
        </Text>
        <TextInput
          style={styles.search}
          placeholder="חיפוש אפליקציה"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />

        {apps !== null && apps.length > 0 && (
          <Pressable onPress={toggleAll} style={styles.lockAllButton} hitSlop={8}>
            <Text style={styles.lockAllText}>{allSelected ? 'בטל בחירה' : 'נעל הכל'}</Text>
          </Pressable>
        )}

        {apps === null ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={styles.listCard}>
            <FlatList
              data={filteredApps}
              keyExtractor={(item) => item.packageName}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <AppListRow
                  name={item.name}
                  iconBase64={item.iconBase64}
                  selected={selected.has(item.packageName)}
                  onToggle={() => toggle(item.packageName)}
                />
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>לא נמצאו אפליקציות תואמות</Text>}
              contentContainerStyle={filteredApps.length === 0 ? styles.emptyContent : undefined}
            />
          </View>
        )}

        <PrimaryButton label="המשך" onPress={handleContinue} style={styles.button} />
      </View>
    </OnboardingScreenShell>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    textAlign: 'right',
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'right',
  },
  search: {
    ...typography.body,
    textAlign: 'right',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  lockAllButton: {
    alignSelf: 'flex-end',
  },
  lockAllText: {
    ...typography.bodySecondary,
    color: colors.accentDark,
    fontWeight: '600',
    textAlign: 'right',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
    padding: spacing.xl,
  },
  button: {
    marginTop: spacing.md,
  },
  });
}
