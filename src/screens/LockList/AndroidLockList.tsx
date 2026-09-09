import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAndroidInstalledApps,
  getAndroidLockedApps,
  setAndroidLockedApps,
} from '../../native/appLocking';
import { PrimaryButton } from '../../components/PrimaryButton';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../theme';
import { AndroidPermissionGate } from './AndroidPermissionGate';
import { AppListRow } from './AppListRow';

interface AndroidApp {
  packageName: string;
  name: string;
  iconBase64?: string | null;
}

export function AndroidLockList() {
  return (
    <AndroidPermissionGate>
      <AndroidLockListContent />
    </AndroidPermissionGate>
  );
}

function AndroidLockListContent() {
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [apps, setApps] = useState<AndroidApp[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    getAndroidInstalledApps()
      .then((installed) => {
        setApps([...installed].sort((a, b) => a.name.localeCompare(b.name, 'he')));
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
    setDirty(true);
  };

  const handleLockAll = () => {
    if (!apps) return;
    setSelected(new Set(apps.map((app) => app.packageName)));
    setDirty(true);
  };

  const handleSave = () => {
    setAndroidLockedApps(Array.from(selected));
    setDirty(false);
  };

  const renderItem = useCallback(
    ({ item }: { item: AndroidApp }) => (
      <AppListRow
        name={item.name}
        iconBase64={item.iconBase64}
        selected={selected.has(item.packageName)}
        onToggle={() => toggle(item.packageName)}
      />
    ),
    [selected]
  );

  if (apps === null) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>אפליקציות נעולות</Text>
          <Pressable style={styles.lockAllButton} onPress={handleLockAll} hitSlop={8}>
            <Text style={styles.lockAllText}>נעל את כולן</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          {selected.size > 0 ? `${selected.size} אפליקציות נבחרו` : 'בחר אפליקציות לנעילה בזמן שימוש'}
        </Text>
        <TextInput
          style={styles.search}
          placeholder="חיפוש אפליקציה"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.listCard}>
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.packageName}
          keyboardShouldPersistTaps="handled"
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyText}>לא נמצאו אפליקציות תואמות</Text>}
          contentContainerStyle={filteredApps.length === 0 ? styles.emptyContent : undefined}
        />
      </View>

      {dirty && (
        <PrimaryButton label="שמור" onPress={handleSave} style={[styles.saveButton, { marginBottom: spacing.xl + insets.bottom }]} />
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
  },
  lockAllButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  // `lockAllButton`'s `primaryLight` fill is a fixed light tone in both
  // themes (see colors.ts), so this text is fixed to match — `colors.primary`
  // would turn light pastel-blue in dark mode against it.
  lockAllText: {
    ...typography.bodySecondary,
    color: lightColors.primary,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.bodySecondary,
  },
  search: {
    ...typography.body,
    textAlign: 'right',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  listCard: {
    flex: 1,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: 20,
    backgroundColor: colors.surface,
    overflow: 'hidden',
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
  saveButton: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  });
}
