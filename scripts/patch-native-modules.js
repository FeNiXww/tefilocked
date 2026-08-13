// expo-app-blocker's android/build.gradle guards its Java/Kotlin JVM-target
// alignment behind `if (agpVersion < 8)`, so on this project's AGP 8.11 that
// block never runs — javac defaults to 17 while kotlinc defaults to the
// installed JDK (21), and :expo-app-blocker:compileDebugKotlin fails with
// "Inconsistent JVM-target compatibility". Re-applied on every `npm install`
// since the fix lives in node_modules and would otherwise be wiped out.
const fs = require('fs');
const path = require('path');

const gradleFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-app-blocker',
  'android',
  'build.gradle'
);

if (!fs.existsSync(gradleFile)) {
  process.exit(0);
}

const broken = `  def agpVersion = com.android.Version.ANDROID_GRADLE_PLUGIN_VERSION
  if (agpVersion.tokenize('.')[0].toInteger() < 8) {
    compileOptions {
      sourceCompatibility JavaVersion.VERSION_17
      targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
      jvmTarget = JavaVersion.VERSION_17.majorVersion
    }
  }`;

const fixed = `  compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = JavaVersion.VERSION_17.majorVersion
  }`;

const contents = fs.readFileSync(gradleFile, 'utf8');

if (contents.includes(broken)) {
  fs.writeFileSync(gradleFile, contents.replace(broken, fixed));
  console.log('[patch-native-modules] Fixed expo-app-blocker JVM target guard.');
}

// The plugin registers AppBlockerService with foregroundServiceType="specialUse"
// but never adds the android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE <property> that
// API 34+ requires for that type. Without it, startForeground() throws
// MissingForegroundServiceTypeException and the service (and app blocking) dies
// on every launch. Patches the config-plugin source so a fresh `expo prebuild`
// generates a working manifest.
const pluginFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-app-blocker',
  'plugin',
  'src',
  'index.js'
);

if (fs.existsSync(pluginFile)) {
  const brokenService = `      mainApplication.service.push({
        $: {
          "android:name": "expo.modules.appblocker.AppBlockerService",
          "android:enabled": "true",
          "android:exported": "false",
          "android:foregroundServiceType": "specialUse",
        },
      });`;

  const fixedService = `      mainApplication.service.push({
        $: {
          "android:name": "expo.modules.appblocker.AppBlockerService",
          "android:enabled": "true",
          "android:exported": "false",
          "android:foregroundServiceType": "specialUse",
        },
        property: [
          {
            $: {
              "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
              "android:value": "app_lock_focus_blocking",
            },
          },
        ],
      });`;

  const pluginContents = fs.readFileSync(pluginFile, 'utf8');

  if (pluginContents.includes(brokenService)) {
    fs.writeFileSync(pluginFile, pluginContents.replace(brokenService, fixedService));
    console.log('[patch-native-modules] Fixed expo-app-blocker specialUse foreground service property.');
  }
}

// The upstream package's Android blocking used a duration-based "earned minutes"
// budget, but the budget rolled over across separate app launches instead of
// expiring per visit and there was no way to foreground the app that triggered the
// lock once the budget was granted. Replaced with a clean wall-clock grant: completing
// the prayer flow unlocks every blocked app for the chosen duration (matching the
// duration picker's own copy and the iOS behavior), replacing any earlier grant
// rather than stacking with it, and directly foregrounds the specific app that
// triggered the lock via PackageManager/Intent right after the prayer flow finishes.
function replaceWhole(filePath, expectedOldStart, newContents, label) {
  if (!fs.existsSync(filePath)) return;
  const current = fs.readFileSync(filePath, 'utf8');
  if (current === newContents) return; // already applied
  if (current.startsWith(expectedOldStart)) {
    fs.writeFileSync(filePath, newContents);
    console.log(`[patch-native-modules] ${label}`);
  }
}

function replaceBlock(filePath, broken, fixed, label) {
  if (!fs.existsSync(filePath)) return;
  const current = fs.readFileSync(filePath, 'utf8');
  // Guard first: some `fixed` blocks are `broken` plus appended text, so once
  // applied the file still contains `broken` as a substring — re-checking
  // `includes(broken)` alone would re-apply and duplicate the appended part.
  if (current.includes(fixed)) return; // already applied
  if (current.includes(broken)) {
    fs.writeFileSync(filePath, current.replace(broken, fixed));
    console.log(`[patch-native-modules] ${label}`);
  }
}

// For pure-deletion patches where `fixed` is just a short trailing anchor
// (not a distinctive superset of `broken`) — replaceBlock's `includes(fixed)`
// guard would match that anchor everywhere, including on an unpatched file,
// and silently no-op forever. Idempotency here only needs `includes(broken)`:
// once the deletion applies, `broken` (the long removed text) is gone too.
function removeBlock(filePath, broken, fixed, label) {
  if (!fs.existsSync(filePath)) return;
  const current = fs.readFileSync(filePath, 'utf8');
  if (current.includes(broken)) {
    fs.writeFileSync(filePath, current.replace(broken, fixed));
    console.log(`[patch-native-modules] ${label}`);
  }
}

const androidSrc = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-app-blocker',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'appblocker'
);

replaceWhole(
  path.join(androidSrc, 'TemporaryUnlockController.kt'),
  'package expo.modules.appblocker\n\nimport android.content.Context\n\n/**\n * Single source of truth for the Android "earned time" budget.',
  `package expo.modules.appblocker

import android.content.Context

/**
 * Single source of truth for whether blocked apps are currently unlocked.
 *
 * A single duration-based grant covers every blocked app at once (not just the one
 * that triggered the prayer flow) and lasts until wall-clock expiry regardless of app
 * switches in between — matching the duration picker's own copy ("open the apps for
 * N minutes, then they lock again") and the iOS behavior. Calling [grant] again
 * replaces any existing grant rather than stacking with it.
 *
 * State is persisted (see [Store]) so it survives service recreation. [AppBlockerService]
 * drives all reads/writes from its poll Handler thread, which serializes them; don't call
 * these from another thread without adding synchronization.
 */
class TemporaryUnlockController(private val context: Context) {
  /** Unlock every blocked app for [durationMinutes], replacing any existing grant. */
  fun grant(durationMinutes: Int) {
    val minutes = if (durationMinutes > 0) durationMinutes else DEFAULT_DURATION_MINUTES
    Store.setExpiresAt(context, System.currentTimeMillis() + minutes * 60_000L)
  }

  /** True while a grant is active and hasn't expired yet. */
  fun isUnlocked(): Boolean {
    val expiresAt = Store.expiresAt(context) ?: return false
    if (System.currentTimeMillis() >= expiresAt) {
      Store.setExpiresAt(context, null)
      return false
    }
    return true
  }

  /** Drop the active grant immediately (e.g. a manual "relock now"). */
  fun clear() {
    Store.setExpiresAt(context, null)
  }

  /**
   * Stateless persistence for the grant's expiry. Readable from anywhere with a
   * [Context] — the running service is not required.
   */
  companion object Store {
    private const val KEY_EXPIRES_AT = "unlock_expires_at_ms"
    private const val DEFAULT_DURATION_MINUTES = 15

    private fun setExpiresAt(context: Context, value: Long?) {
      val editor = AppBlockerPrefs.get(context).edit()
      if (value != null) editor.putLong(KEY_EXPIRES_AT, value) else editor.remove(KEY_EXPIRES_AT)
      editor.apply()
    }

    private fun expiresAt(context: Context): Long? {
      val prefs = AppBlockerPrefs.get(context)
      return if (prefs.contains(KEY_EXPIRES_AT)) prefs.getLong(KEY_EXPIRES_AT, 0L) else null
    }

    /** Seconds remaining on the active grant, or 0 if none/expired. Used by the native module's \`getRemainingUnlockTimeAndroid\` binding. */
    fun remainingSeconds(context: Context): Int {
      val expiresAt = expiresAt(context) ?: return 0
      val remainingMs = expiresAt - System.currentTimeMillis()
      return if (remainingMs > 0) (remainingMs / 1000).toInt() else 0
    }
  }
}
`,
  'Replaced expo-app-blocker Android duration-based unlock (rolling budget, no direct-launch) with a wall-clock grant covering every blocked app (TemporaryUnlockController).'
);

const appBlockerServiceFile = path.join(androidSrc, 'AppBlockerService.kt');

replaceBlock(
  appBlockerServiceFile,
  `  private var lastForegroundPackage: String? = null
  // Last *known* foreground app. UsageStats only reports recent transitions, so a
  // poll can momentarily read null while the user sits in one app — we retain the
  // last non-null reading so earned-time consumption and re-blocking stay reliable.
  private var currentForeground: String? = null
  private lateinit var overlayManager: OverlayManager
  private val unlockController by lazy { TemporaryUnlockController(this) }
  // Timestamp of the last tick spent consuming earned time; 0 when not consuming.
  private var consumingSinceMs = 0L
  // Whether a block is currently being enforced (overlay shown / app redirected).
  private var blocking = false

  private val pollRunnable = object : Runnable {
    override fun run() {
      tick()
      handler.postDelayed(this, POLL_INTERVAL_MS)
    }
  }

  private fun tick() {
    getCurrentForegroundPackage()?.let { currentForeground = it }
    val foreground = currentForeground

    if (foreground == null || !isBlocked(foreground)) {
      // Outside any blocked app: pause consumption and drop any active block.
      consumingSinceMs = 0L
      clearBlock()
      lastForegroundPackage = foreground
      return
    }

    if (unlockController.hasTimeLeft) {
      // Inside a blocked app with earned time — spend it and keep the app usable.
      val now = System.currentTimeMillis()
      if (consumingSinceMs > 0L) unlockController.consume(now - consumingSinceMs)
      consumingSinceMs = now
      if (unlockController.hasTimeLeft) {
        clearBlock()
      } else {
        // Earned time ran out while still inside the app.
        Log.d(TAG, "Earned time exhausted in foreground app: $foreground")
        enforceBlock(foreground, BlockReason.EXPIRED)
      }
    } else {
      // Inside a blocked app with no earned time — block on entry.
      consumingSinceMs = 0L
      if (!blocking || foreground != lastForegroundPackage) {
        Log.d(TAG, "Blocked app in foreground: $foreground")
        enforceBlock(foreground, BlockReason.OPENED)
      }
    }
    lastForegroundPackage = foreground
  }`,
  `  private var lastForegroundPackage: String? = null
  // Last *known* foreground app. UsageStats only reports recent transitions, so a
  // poll can momentarily read null while the user sits in one app — we retain the
  // last non-null reading so re-blocking stays reliable.
  private var currentForeground: String? = null
  private lateinit var overlayManager: OverlayManager
  private val unlockController by lazy { TemporaryUnlockController(this) }
  // Whether a block is currently being enforced (overlay shown / app redirected).
  private var blocking = false

  private val pollRunnable = object : Runnable {
    override fun run() {
      tick()
      handler.postDelayed(this, POLL_INTERVAL_MS)
    }
  }

  private fun tick() {
    getCurrentForegroundPackage()?.let { currentForeground = it }
    val foreground = currentForeground

    if (foreground == null || !isBlocked(foreground)) {
      clearBlock()
      lastForegroundPackage = foreground
      return
    }

    if (unlockController.isUnlocked()) {
      clearBlock()
    } else if (!blocking || foreground != lastForegroundPackage) {
      Log.d(TAG, "Blocked app in foreground: $foreground")
      enforceBlock(foreground, BlockReason.OPENED)
    }
    lastForegroundPackage = foreground
  }`,
  'Rewrote AppBlockerService.tick() to use the wall-clock grant instead of a per-package passthrough or a consumed time budget.'
);

replaceBlock(
  appBlockerServiceFile,
  `  private fun enforceBlock(packageName: String, reason: BlockReason) {
    overlayManager.show(packageName, reason)
    showBlockedNotification(packageName, reason)
    recordIntercept(packageName)
    blocking = true
    consumingSinceMs = 0L
  }`,
  `  private fun enforceBlock(packageName: String, reason: BlockReason) {
    overlayManager.show(packageName, reason)
    showBlockedNotification(packageName, reason)
    recordIntercept(packageName)
    blocking = true
  }`,
  'Removed stale consumingSinceMs reference from AppBlockerService.enforceBlock().'
);

replaceBlock(
  appBlockerServiceFile,
  `  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_TEMPORARY_UNLOCK -> {
        val minutes = intent.getIntExtra(EXTRA_DURATION_MINUTES, 0)
        Log.d(TAG, "Granting $minutes minutes of earned time")
        unlockController.grant(minutes)
        consumingSinceMs = 0L
        clearBlock()
      }
      ACTION_RELOCK -> {
        Log.d(TAG, "Relock: dropping earned time")
        unlockController.clear()
        consumingSinceMs = 0L
        // Forget the last-seen app so a blocked app already in the foreground is
        // re-blocked on the next poll. Clearing currentForeground too avoids a
        // stale reading wrongly blocking a non-blocked app if the next poll reads null.
        lastForegroundPackage = null
        currentForeground = null
        clearBlock()
      }
    }
    return START_STICKY
  }`,
  `  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_UNLOCK_AND_LAUNCH -> {
        val packageName = intent.getStringExtra(EXTRA_PACKAGE_NAME)
        val minutes = intent.getIntExtra(EXTRA_DURATION_MINUTES, 0)
        Log.d(TAG, "Unlocking all blocked apps for \${minutes}min, launching $packageName")
        unlockController.grant(minutes)
        clearBlock()
        if (packageName != null) launchApp(packageName)
      }
      ACTION_RELOCK -> {
        Log.d(TAG, "Relock: dropping active grant")
        unlockController.clear()
        // Forget the last-seen app so a blocked app already in the foreground is
        // re-blocked on the next poll. Clearing currentForeground too avoids a
        // stale reading wrongly blocking a non-blocked app if the next poll reads null.
        lastForegroundPackage = null
        currentForeground = null
        clearBlock()
      }
    }
    return START_STICKY
  }

  /** Foreground the target app directly via PackageManager/Intent, e.g. right after the prayer flow finishes. */
  private fun launchApp(packageName: String) {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    if (launchIntent == null) {
      Log.w(TAG, "launchApp: no launch intent for $packageName")
      return
    }
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    startActivity(launchIntent)
  }`,
  'Replaced AppBlockerService unlock command with unlockAndLaunch (grants a wall-clock unlock for every blocked app + launches target app).'
);

replaceBlock(
  appBlockerServiceFile,
  `    private const val POLL_INTERVAL_MS = 500L
    private const val LOOKBACK_WINDOW_MS = 10_000L
    private const val ACTION_TEMPORARY_UNLOCK = "expo.modules.appblocker.TEMPORARY_UNLOCK"
    private const val ACTION_RELOCK = "expo.modules.appblocker.RELOCK"
    private const val EXTRA_DURATION_MINUTES = "duration_minutes"

    fun start(context: Context) {
      startCommand(context, Intent(context, AppBlockerService::class.java))
    }

    fun stop(context: Context) {
      val intent = Intent(context, AppBlockerService::class.java)
      context.stopService(intent)
    }

    fun temporaryUnlock(context: Context, durationMinutes: Int) {
      val intent = Intent(context, AppBlockerService::class.java).apply {
        action = ACTION_TEMPORARY_UNLOCK
        putExtra(EXTRA_DURATION_MINUTES, durationMinutes)
      }
      startCommand(context, intent)
    }`,
  `    private const val POLL_INTERVAL_MS = 500L
    private const val LOOKBACK_WINDOW_MS = 10_000L
    private const val ACTION_UNLOCK_AND_LAUNCH = "expo.modules.appblocker.UNLOCK_AND_LAUNCH"
    private const val ACTION_RELOCK = "expo.modules.appblocker.RELOCK"
    private const val EXTRA_PACKAGE_NAME = "package_name"
    private const val EXTRA_DURATION_MINUTES = "duration_minutes"

    fun start(context: Context) {
      startCommand(context, Intent(context, AppBlockerService::class.java))
    }

    fun stop(context: Context) {
      val intent = Intent(context, AppBlockerService::class.java)
      context.stopService(intent)
    }

    fun unlockAndLaunch(context: Context, packageName: String, durationMinutes: Int) {
      val intent = Intent(context, AppBlockerService::class.java).apply {
        action = ACTION_UNLOCK_AND_LAUNCH
        putExtra(EXTRA_PACKAGE_NAME, packageName)
        putExtra(EXTRA_DURATION_MINUTES, durationMinutes)
      }
      startCommand(context, intent)
    }`,
  'Renamed AppBlockerService companion action/extra constants and threaded the granted duration through unlockAndLaunch.'
);

// Bug: `getStringExtra` can return an empty string (unlockAndLaunchAndroidApp's JS
// side coerces a missing target package to `""` rather than omitting the extra), and
// `packageName != null` lets `""` straight through. `launchApp("")` then resolves no
// launch intent and returns having done nothing — the grant+clearBlock above still
// succeed, so the user just stays on whatever's already on screen (this app) instead
// of being foregrounded into the app they meant to open, with no visible error either
// side of the bridge. See also the JS-side warning this pairs with in
// src/native/appLocking/index.tsx's unlockAndLaunchAndroidApp.
replaceBlock(
  appBlockerServiceFile,
  `        unlockController.grant(minutes)
        clearBlock()
        if (packageName != null) launchApp(packageName)
      }`,
  `        unlockController.grant(minutes)
        clearBlock()
        if (!packageName.isNullOrBlank()) {
          launchApp(packageName)
        } else {
          Log.w(TAG, "unlockAndLaunch: no target package name provided — skipping launch, app stays foregrounded")
        }
      }`,
  'Fixed AppBlockerService.unlockAndLaunch: an empty-string target package (not just null) was silently skipping the post-unlock app launch.'
);

replaceBlock(
  path.join(androidSrc, 'ExpoAppBlockerModule.kt'),
  `    Function("temporaryUnlockAndroid") { durationMinutes: Int ->
      AppBlockerService.temporaryUnlock(context, durationMinutes)
      Log.d(TAG, "temporaryUnlockAndroid: $durationMinutes minutes")
    }`,
  `    Function("unlockAndLaunchAndroid") { packageName: String, durationMinutes: Int ->
      AppBlockerService.unlockAndLaunch(context, packageName, durationMinutes)
      Log.d(TAG, "unlockAndLaunchAndroid: $packageName for \${durationMinutes}min")
    }`,
  'Renamed ExpoAppBlockerModule.temporaryUnlockAndroid to unlockAndLaunchAndroid(packageName, durationMinutes).'
);

const jsIndexFile = path.join(__dirname, '..', 'node_modules', 'expo-app-blocker', 'src', 'index.ts');

replaceBlock(
  jsIndexFile,
  `export function startMonitoring(): void {
  if (Platform.OS !== "android") return;
  NativeModule.startMonitoring();
}

export function stopMonitoring(): void {
  if (Platform.OS !== "android") return;
  NativeModule.stopMonitoring();
}`,
  `export function startMonitoring(): void {
  if (Platform.OS !== "android") return;
  NativeModule.startMonitoring();
}

export function stopMonitoring(): void {
  if (Platform.OS !== "android") return;
  NativeModule.stopMonitoring();
}

/**
 * Android-only: unlock every blocked app for \`durationMinutes\`, then foreground
 * \`packageName\` directly — e.g. right after the prayer flow finishes. The grant
 * covers all blocked apps (not just \`packageName\`) and lasts until it expires,
 * regardless of app switches in between. Calling again replaces any active grant.
 * Launches the app directly via PackageManager/Intent; there's nothing to await.
 */
export function unlockAndLaunchAndroid(packageName: string, durationMinutes: number = 15): void {
  if (Platform.OS !== "android") return;
  NativeModule.unlockAndLaunchAndroid(packageName, Math.max(1, Math.round(durationMinutes)));
}`,
  'Added unlockAndLaunchAndroid() to the expo-app-blocker JS API.'
);

replaceBlock(
  jsIndexFile,
  `/**
 * Suppress blocking for \`durationMinutes\`, then auto-resume.
 *
 * iOS removes the Family Controls shields; Android pauses the foreground-service
 * poll (the timer lives in the service, so it survives app backgrounding).
 * Calling again replaces any active unlock. Android rounds to a whole minute (min 1).
 */
export async function temporaryUnlock(durationMinutes: number = 15): Promise<TemporaryUnlockResult> {
  if (Platform.OS === "android") {
    NativeModule.temporaryUnlockAndroid(Math.max(1, Math.round(durationMinutes)));
    return { unlocked: true, expiresAt: Date.now() + durationMinutes * 60_000 };
  }
  return NativeModule.temporaryUnlock(durationMinutes);
}

/** iOS only — returns \`false\` on Android. On Android use \`getRemainingUnlockTime() > 0\`. */
export function isTemporarilyUnlocked(): boolean {
  if (Platform.OS !== "ios") return false;
  return NativeModule.isTemporarilyUnlocked();
}

/**
 * Seconds remaining on the active temporary unlock, or 0 if none.
 *
 * Platform divergence: on **Android** this ticks down live as the budget is spent
 * inside blocked apps (and freezes when you leave). On **iOS** Apple does not expose
 * live cumulative usage, so this returns the *granted* budget and stays flat until
 * the usage threshold re-applies the shield (then drops to 0). Don't rely on a
 * smooth iOS countdown.
 */
export function getRemainingUnlockTime(): number {
  if (Platform.OS === "android") return NativeModule.getRemainingUnlockTimeAndroid();
  return NativeModule.getRemainingUnlockTime();
}`,
  `/**
 * iOS only: suppress blocking for \`durationMinutes\`, then auto-resume — removes the
 * Family Controls shields for the granted duration. Calling again replaces any active
 * unlock.
 *
 * Android has an equivalent timed grant, but it's requested together with the app to
 * foreground: use [unlockAndLaunchAndroid] instead.
 */
export async function temporaryUnlock(durationMinutes: number = 15): Promise<TemporaryUnlockResult> {
  if (Platform.OS !== "ios") {
    throw new Error(
      "temporaryUnlock(durationMinutes) is iOS-only. On Android use unlockAndLaunchAndroid(packageName, durationMinutes) instead."
    );
  }
  return NativeModule.temporaryUnlock(durationMinutes);
}

/** iOS only — returns \`false\` on Android. On Android use \`getRemainingUnlockTime() > 0\`. */
export function isTemporarilyUnlocked(): boolean {
  if (Platform.OS !== "ios") return false;
  return NativeModule.isTemporarilyUnlocked();
}

/**
 * Seconds remaining on the active temporary unlock, or 0 if none.
 *
 * **iOS**: the granted budget from [temporaryUnlock], ticking down as usage-threshold
 * events land (Apple doesn't expose live cumulative usage, so this can stay flat
 * between threshold callbacks — don't rely on a smooth countdown).
 *
 * **Android**: seconds left until the grant from [unlockAndLaunchAndroid] expires,
 * \`0\` if none is active.
 */
export function getRemainingUnlockTime(): number {
  if (Platform.OS === "android") return NativeModule.getRemainingUnlockTimeAndroid();
  return NativeModule.getRemainingUnlockTime();
}`,
  'Made expo-app-blocker temporaryUnlock() iOS-only and updated getRemainingUnlockTime() docs for Android.'
);

// iOS bug: granting a timed unlock (LockContentFlow's duration step) sets
// `appBlocker.temporaryUnlock.v1` in the App Group as an Int budget-in-seconds
// (see ExpoAppBlockerModule.swift's `temporaryUnlock`/`remainingUnlockSeconds`).
// But ShieldConfigurationExtension's `isTemporarilyUnlocked()` read the same
// key `as? Date`, which always fails against a stored Int and always returned
// false. ManagedSettings shields don't clear instantly — there's a documented
// few-second lag — and this data source is what the system falls back to
// during that lag. With the cast permanently broken, the app that should show
// a soft "your free time is loading, try again in a moment" instead showed the
// full "this app is locked" shield right after a successful unlock, making a
// working grant look like it had failed. Fixed to read the same Int budget
// (plus the matching consumed/granted-at keys) the module itself uses.
const shieldConfigBroken = `  private func isTemporarilyUnlocked() -> Bool {
    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else { return false }
    guard let expiration = defaults.object(forKey: "appBlocker.temporaryUnlock.v1") as? Date else { return false }
    return Date() < expiration
  }`;

const shieldConfigFixed = `  // Same App Group keys ExpoAppBlockerModule.swift writes on \`temporaryUnlock()\`
  // and reads back in \`remainingUnlockSeconds()\` — kept in sync so this data
  // source's "still unlocked?" check agrees with the module's own source of truth.
  private let temporaryUnlockKey = "appBlocker.temporaryUnlock.v1"
  private let usageConsumedKey = "appBlocker.usageConsumedSeconds.v1"
  private let unlockGrantedAtKey = "appBlocker.unlockGrantedAt.v1"

  // The granted budget is stored as an Int (seconds), not a Date — reading it
  // \`as? Date\` always failed the cast and returned false here, so this data
  // source could never show the transient "your free time is loading" shield
  // config right after a successful unlock. Instead, in the brief window before
  // ManagedSettings actually clears the shield (a documented few-seconds lag),
  // the system re-invoked this data source and it fell through to the full
  // "locked" config — making a fresh unlock look like it hadn't taken effect.
  private func isTemporarilyUnlocked() -> Bool {
    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else { return false }
    let budgetSeconds = (defaults.object(forKey: temporaryUnlockKey) as? Int) ?? 0
    guard budgetSeconds > 0 else { return false }

    // Earned time does not carry across midnight — a grant from an earlier
    // calendar day is stale, matching ExpoAppBlockerModule's daily reset.
    if let grantedAt = defaults.object(forKey: unlockGrantedAtKey) as? Date,
       !Calendar.current.isDate(grantedAt, inSameDayAs: Date()) {
      return false
    }

    let consumedSeconds = (defaults.object(forKey: usageConsumedKey) as? Int) ?? 0
    return consumedSeconds < budgetSeconds
  }`;

// Patch the package's own template (what the config plugin re-copies into
// targets/ on every config evaluation — see plugin/src/index.js) so future
// prebuilds don't reintroduce the bug...
replaceBlock(
  path.join(__dirname, '..', 'node_modules', 'expo-app-blocker', 'targets', 'ShieldConfiguration', 'ShieldConfigurationExtension.swift'),
  shieldConfigBroken,
  shieldConfigFixed,
  'Fixed expo-app-blocker ShieldConfigurationExtension template: isTemporarilyUnlocked() read the Int unlock budget as a Date.'
);

// ...and this project's already-generated copy directly, so the fix is live
// immediately instead of waiting for the next config evaluation to re-copy it.
replaceBlock(
  path.join(__dirname, '..', 'targets', 'ShieldConfiguration', 'ShieldConfigurationExtension.swift'),
  shieldConfigBroken,
  shieldConfigFixed,
  'Fixed targets/ShieldConfiguration/ShieldConfigurationExtension.swift: isTemporarilyUnlocked() read the Int unlock budget as a Date.'
);

// Product decision: replace the "this app is locked" popup (a full-screen
// overlay with title/body text, plus a separate heads-up "Blocked App
// Alerts" notification) with a haptic-first interception — one clean native
// impact, then a text-free brand-colored cover just long enough to prevent
// the previous app's content from flashing through while the deep link back
// into Tefillah Lock lands. The app's own LockContentFlow fade (see
// src/screens/LockContentFlow/index.tsx) carries the rest of the transition.
const overlayManagerFile = path.join(androidSrc, 'OverlayManager.kt');

replaceWhole(
  overlayManagerFile,
  `package expo.modules.appblocker

import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

class OverlayManager(private val context: Context) {`,
  `package expo.modules.appblocker

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager

class OverlayManager(private val context: Context) {
  private val windowManager: WindowManager =
    context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

  private var overlayView: View? = null

  fun show(blockedPackageName: String? = null, reason: BlockReason = BlockReason.OPENED) {
    if (overlayView != null) {
      Log.d(TAG, "Overlay already visible")
      if (blockedPackageName != null) {
        navigateToApp(blockedPackageName, reason)
      } else {
        bringAppToFront()
      }
      return
    }

    // The interception itself is communicated with one clean haptic pulse
    // instead of an on-screen "this app is locked" message — fired right as
    // the (text-free) cover view goes up, before the deep link even starts
    // resolving, so it reads as instant.
    triggerHaptic()

    val view = buildOverlayView()
    try {
      windowManager.addView(view, buildLayoutParams())
      overlayView = view
      Log.d(TAG, "Overlay shown")
    } catch (e: Exception) {
      Log.e(TAG, "Failed to add overlay view", e)
      return
    }

    if (blockedPackageName != null) {
      navigateToApp(blockedPackageName, reason)
    } else {
      bringAppToFront()
    }
  }

  /** One clean impact — the Android equivalent of Face ID / Apple Pay's confirmation tap, not a buzz or a pattern. */
  private fun triggerHaptic() {
    try {
      val vibrator: Vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
        manager.defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
      }
      when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ->
          vibrator.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK))
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ->
          vibrator.vibrate(VibrationEffect.createOneShot(45L, VibrationEffect.DEFAULT_AMPLITUDE))
        else -> {
          @Suppress("DEPRECATION")
          vibrator.vibrate(45L)
        }
      }
    } catch (e: Exception) {
      Log.w(TAG, "Haptic feedback failed", e)
    }
  }

  fun hide() {
    val view = overlayView ?: return
    try {
      windowManager.removeView(view)
      Log.d(TAG, "Overlay hidden")
    } catch (e: Exception) {
      Log.e(TAG, "Failed to remove overlay view", e)
    }
    overlayView = null
  }

  private fun resolveAppName(packageName: String): String = try {
    val pm = context.packageManager
    val appInfo = pm.getApplicationInfo(packageName, 0)
    pm.getApplicationLabel(appInfo).toString()
  } catch (e: Exception) {
    packageName
  }

  private fun navigateToApp(blockedPackageName: String, reason: BlockReason) {
    val appName = resolveAppName(blockedPackageName)

    // Use the app's own scheme for deep linking
    val scheme = getAppScheme()
    val deepLinkIntent = Intent(
      Intent.ACTION_VIEW,
      Uri.parse(
        "\${scheme}://blocked?app=\${Uri.encode(appName)}" +
          "&package=\${Uri.encode(blockedPackageName)}&reason=\${reason.slug}"
      )
    ).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    try {
      context.startActivity(deepLinkIntent)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to deep link", e)
      bringAppToFront()
    }
  }

  private fun bringAppToFront() {
    val launchIntent = context.packageManager
      .getLaunchIntentForPackage(context.packageName)
      ?.apply {
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        )
      }

    if (launchIntent == null) {
      Log.w(TAG, "No launch intent for package \${context.packageName}")
      return
    }

    context.startActivity(launchIntent)
  }

  private fun getAppScheme(): String {
    val resId = context.resources.getIdentifier("expo_app_blocker_scheme", "string", context.packageName)
    if (resId != 0) return context.getString(resId)
    return context.packageName.replace(".", "-")
  }

  /**
   * No message, no icon, no spinner — just an instant, brand-colored cover so
   * the previous app's content can't flash through during the brief window
   * before the deep link lands. The interception itself is communicated by
   * the haptic in [show] and the app's own fade-in, not on-screen text.
   */
  private fun buildOverlayView(): View {
    val backgroundColor = parseColorOrDefault(
      AppBlockerPrefs.getOverlayBackgroundColor(context),
      Color.WHITE,
    )
    return View(context).apply {
      setBackgroundColor(backgroundColor)
    }
  }

  private fun parseColorOrDefault(hex: String, fallback: Int): Int = try {
    Color.parseColor(hex)
  } catch (_: IllegalArgumentException) {
    fallback
  }

  private fun buildLayoutParams(): WindowManager.LayoutParams {
    @Suppress("DEPRECATION")
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      WindowManager.LayoutParams.TYPE_PHONE
    }

    return WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
    }
  }

  companion object {
    private const val TAG = "ExpoAppBlocker"
  }
}
`,
  'Replaced expo-app-blocker OverlayManager: removed the "this app is locked" title/body/icon/spinner UI in favor of a text-free brand-colored cover + a native haptic fired at interception.'
);

replaceBlock(
  appBlockerServiceFile,
  `import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build`,
  `import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build`,
  'Removed now-unused PendingIntent/Uri imports from AppBlockerService.kt (were only used by the removed showBlockedNotification()).'
);

replaceBlock(
  appBlockerServiceFile,
  `  private fun enforceBlock(packageName: String, reason: BlockReason) {
    overlayManager.show(packageName, reason)
    showBlockedNotification(packageName, reason)
    recordIntercept(packageName)
    blocking = true
  }`,
  `  private fun enforceBlock(packageName: String, reason: BlockReason) {
    overlayManager.show(packageName, reason)
    recordIntercept(packageName)
    blocking = true
  }`,
  'Removed the showBlockedNotification() call from AppBlockerService.enforceBlock() — no more separate "Blocked App Alerts" heads-up notification.'
);

removeBlock(
  appBlockerServiceFile,
  `  private fun showBlockedNotification(packageName: String, reason: BlockReason) {
    val appName = try {
      val pm = this.packageManager
      val appInfo = pm.getApplicationInfo(packageName, 0)
      pm.getApplicationLabel(appInfo).toString()
    } catch (e: Exception) {
      packageName
    }

    val title = AppBlockerPrefs.getNotificationTitle(this).replace("{appName}", appName)
    val text = AppBlockerPrefs.getNotificationText(this).replace("{appName}", appName)

    val scheme = getAppScheme()
    val deepLinkIntent = Intent(
      Intent.ACTION_VIEW,
      Uri.parse(
        "\${scheme}://blocked?app=\${Uri.encode(appName)}" +
          "&package=\${Uri.encode(packageName)}&reason=\${reason.slug}"
      )
    ).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    val launchIntent = packageManager.getLaunchIntentForPackage(this.packageName)
      ?.apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP) }

    val resolvedIntent = try {
      deepLinkIntent.resolveActivity(packageManager)?.let { deepLinkIntent } ?: launchIntent
    } catch (e: Exception) {
      launchIntent
    } ?: deepLinkIntent

    val pendingIntent = PendingIntent.getActivity(
      this, packageName.hashCode(), resolvedIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = NotificationCompat.Builder(this, BLOCKED_CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(applicationInfo.icon)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(pendingIntent)
      .build()

    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(BLOCKED_NOTIFICATION_ID, notification)
  }

  private fun getAppScheme(): String {
    val resId = resources.getIdentifier("expo_app_blocker_scheme", "string", packageName)
    if (resId != 0) return getString(resId)
    return try {
      packageManager.getLaunchIntentForPackage(packageName)?.data?.scheme
        ?: packageName.replace(".", "-")
    } catch (e: Exception) {
      packageName.replace(".", "-")
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {`,
  `  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {`,
  'Removed AppBlockerService.showBlockedNotification()/getAppScheme() entirely — the heads-up "Blocked App Alerts" notification is gone.'
);

replaceBlock(
  appBlockerServiceFile,
  `      val serviceChannel = NotificationChannel(
        CHANNEL_ID, "App Blocker", NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Keeps the app blocker running"
        setShowBadge(false)
      }
      manager.createNotificationChannel(serviceChannel)

      val blockedChannel = NotificationChannel(
        BLOCKED_CHANNEL_ID, "Blocked App Alerts", NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Notifications when a blocked app is detected"
      }
      manager.createNotificationChannel(blockedChannel)
    }
  }`,
  `      val serviceChannel = NotificationChannel(
        CHANNEL_ID, "App Blocker", NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Keeps the app blocker running"
        setShowBadge(false)
      }
      manager.createNotificationChannel(serviceChannel)
    }
  }`,
  'Removed the now-unused BLOCKED_CHANNEL_ID ("Blocked App Alerts") notification channel from AppBlockerService.'
);

replaceBlock(
  appBlockerServiceFile,
  `    private const val TAG = "ExpoAppBlocker"
    private const val CHANNEL_ID = "expo_app_blocker_channel"
    private const val BLOCKED_CHANNEL_ID = "expo_app_blocker_blocked"
    private const val NOTIFICATION_ID = 9001
    private const val BLOCKED_NOTIFICATION_ID = 9002
    private const val POLL_INTERVAL_MS = 500L`,
  `    private const val TAG = "ExpoAppBlocker"
    private const val CHANNEL_ID = "expo_app_blocker_channel"
    private const val NOTIFICATION_ID = 9001
    private const val POLL_INTERVAL_MS = 500L`,
  'Removed the now-unused BLOCKED_CHANNEL_ID/BLOCKED_NOTIFICATION_ID constants from AppBlockerService.'
);

// iOS: fire one clean haptic the instant the user taps through Apple's own
// Screen Time shield — that system shield screen itself is OS-mandated by
// the Family Controls framework and can't be removed by app code, but the
// tap-to-return transition it hands off to can still feel premium.
const shieldActionBroken = `    recordIntercept()
    switch action {
    case .primaryButtonPressed:
      setPendingUnlockFlag()`;

const shieldActionFixed = `    recordIntercept()
    switch action {
    case .primaryButtonPressed:
      triggerHaptic()
      setPendingUnlockFlag()`;

const shieldActionCompleteBroken = `  private func complete(on response: ShieldActionResponse, completionHandler: @escaping (ShieldActionResponse) -> Void) {`;
const shieldActionCompleteFixed = `  /// One clean impact the instant the user taps through the shield — the
  /// Face ID / Apple Pay confirmation feel, not a system alert sound.
  private func triggerHaptic() {
    let generator = UIImpactFeedbackGenerator(style: .medium)
    generator.prepare()
    generator.impactOccurred()
  }

  private func complete(on response: ShieldActionResponse, completionHandler: @escaping (ShieldActionResponse) -> Void) {`;

for (const shieldActionFile of [
  path.join(__dirname, '..', 'node_modules', 'expo-app-blocker', 'targets', 'ShieldAction', 'ShieldActionExtension.swift'),
  path.join(__dirname, '..', 'targets', 'ShieldAction', 'ShieldActionExtension.swift'),
]) {
  replaceBlock(shieldActionFile, shieldActionBroken, shieldActionFixed, `Added a haptic trigger to ${shieldActionFile}'s primaryButtonPressed handler.`);
  replaceBlock(shieldActionFile, shieldActionCompleteBroken, shieldActionCompleteFixed, `Added triggerHaptic() to ${shieldActionFile}.`);
}
