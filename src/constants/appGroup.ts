// Used by app code (src/widgets/syncStreakWidget.ts) to write shared state
// for the iOS widget via ExtensionStorage. Must match IOS_APP_GROUP in
// app.config.ts — kept as a separate literal there rather than imported
// from here because Expo's config loader can't resolve a nested .ts
// require from app.config.ts.
export const IOS_APP_GROUP = 'group.org.tefillahlock.app.blocker';
