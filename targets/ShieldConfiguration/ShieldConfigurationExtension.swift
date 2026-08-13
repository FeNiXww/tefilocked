import ManagedSettingsUI
import ManagedSettings
import UIKit

class ShieldConfigurationExtension: ShieldConfigurationDataSource {

  private let appGroupIdentifier = "group.org.tefillok.app.blocker"

  // All values below are replaced by the config plugin at prebuild time
  private let shieldTitle = "רגע לפני שממשיכים"
  private let shieldSubtitle = "{appName} נעולה כרגע"
  private let shieldPrimaryButtonLabel = "לפתוח את תפילוק"
  private let shieldSecondaryButtonLabel = "none"
  // Temporary-unlock state copy — shown briefly while ManagedSettings clears
  // after a successful unlock. Configurable via plugin options.
  private let shieldTempUnlockTitle = "Almost there!"
  private let shieldTempUnlockSubtitle = "Your free time is loading. Try again in a moment."
  private let shieldTempUnlockButtonLabel = "OK"
  private let shieldPrimaryButtonColor = UIColor(red: 0.106, green: 0.165, blue: 0.278, alpha: 1.0)
  private let shieldBackgroundColor: UIColor? = nil
  private let shieldBlurStyle: UIBlurEffect.Style? = .systemThickMaterialLight
  private let shieldTitleColor = UIColor(red: 0.067, green: 0.067, blue: 0.067, alpha: 1.0)
  private let shieldSubtitleColor = UIColor(red: 0.451, green: 0.451, blue: 0.451, alpha: 1.0)

  private var mascotIcon: UIImage? {
    let bundle = Bundle(for: type(of: self))
    return UIImage(named: "shield-icon", in: bundle, compatibleWith: nil)
      ?? UIImage(contentsOfFile: bundle.path(forResource: "shield-icon", ofType: "png") ?? "")
  }

  private func getBlockedAppCount() -> Int {
    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else { return 0 }
    guard let config = defaults.dictionary(forKey: "appBlocker.blockConfiguration.v1") else { return 0 }
    if let items = config["blockedItems"] as? [[String: Any]] {
      return items.count
    }
    return 0
  }

  // Same App Group keys ExpoAppBlockerModule.swift writes on `temporaryUnlock()`
  // and reads back in `remainingUnlockSeconds()` — kept in sync so this data
  // source's "still unlocked?" check agrees with the module's own source of truth.
  private let temporaryUnlockKey = "appBlocker.temporaryUnlock.v1"
  private let usageConsumedKey = "appBlocker.usageConsumedSeconds.v1"
  private let unlockGrantedAtKey = "appBlocker.unlockGrantedAt.v1"

  // The granted budget is stored as an Int (seconds), not a Date — reading it
  // `as? Date` always failed the cast and returned false here, so this data
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
  }

  // Block-event queue, drained by the app into `blocker_intercepts` to power
  // the "blocks" counter. The system re-renders the shield often (app
  // switcher previews, re-foreground), so a short global debounce collapses
  // those bursts into one logical block event.
  private let pendingInterceptsKey = "appBlocker.pendingIntercepts.v1"
  private let lastInterceptTsKey = "appBlocker.lastInterceptTs.v1"
  private let interceptDebounceMs: Double = 2_000
  private let maxPendingIntercepts = 200

  // Best-effort block recording. iOS caches the shield configuration and
  // does NOT reliably re-invoke this data source per open, so the action
  // handler (ShieldAction) is the primary recorder; this is a bonus path
  // for the cases the system does re-invoke. Writes share the same App
  // Group JSON queue + debounce as ShieldAction.
  private func recordIntercept(appName: String) {
    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else { return }
    defaults.synchronize()

    let nowMs = Date().timeIntervalSince1970 * 1000.0
    let lastMs = defaults.double(forKey: lastInterceptTsKey)
    if lastMs > 0, (nowMs - lastMs) < interceptDebounceMs { return }

    var queue: [[String: Any]] = []
    if let json = defaults.string(forKey: pendingInterceptsKey),
       let data = json.data(using: .utf8),
       let parsed = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
      queue = parsed
    }
    queue.append(["appName": appName, "interceptedAt": nowMs])
    if queue.count > maxPendingIntercepts {
      queue = Array(queue.suffix(maxPendingIntercepts))
    }
    if let data = try? JSONSerialization.data(withJSONObject: queue),
       let json = String(data: data, encoding: .utf8) {
      defaults.set(json, forKey: pendingInterceptsKey)
    }
    defaults.set(nowMs, forKey: lastInterceptTsKey)
    defaults.synchronize()
  }

  private func makeConfig(appName: String) -> ShieldConfiguration {
    if isTemporarilyUnlocked() {
      return ShieldConfiguration(
        backgroundBlurStyle: shieldBlurStyle,
        backgroundColor: shieldBackgroundColor,
        icon: mascotIcon,
        title: ShieldConfiguration.Label(text: shieldTempUnlockTitle, color: shieldTitleColor),
        subtitle: ShieldConfiguration.Label(text: shieldTempUnlockSubtitle, color: shieldSubtitleColor),
        primaryButtonLabel: ShieldConfiguration.Label(text: shieldTempUnlockButtonLabel, color: .white),
        primaryButtonBackgroundColor: shieldPrimaryButtonColor,
        secondaryButtonLabel: nil
      )
    }

    // A blocked app is being shielded — this is a block event. Record it
    // (debounced) for the app to drain.
    recordIntercept(appName: appName)

    let count = getBlockedAppCount()
    // The plugin replaces this placeholder with a Swift string literal
    // containing `\(count)` interpolation, or `""` when the user opted out.
    let context = count > 1 ? " You have \(count) apps blocked." : ""
    let subtitle = shieldSubtitle.replacingOccurrences(of: "{appName}", with: appName) + context

    let hasSecondary = !shieldSecondaryButtonLabel.isEmpty && shieldSecondaryButtonLabel != "none"

    return ShieldConfiguration(
      backgroundBlurStyle: shieldBlurStyle,
      backgroundColor: shieldBackgroundColor,
      icon: mascotIcon,
      title: ShieldConfiguration.Label(text: shieldTitle, color: shieldTitleColor),
      subtitle: ShieldConfiguration.Label(text: subtitle, color: shieldSubtitleColor),
      primaryButtonLabel: ShieldConfiguration.Label(text: shieldPrimaryButtonLabel, color: .white),
      primaryButtonBackgroundColor: shieldPrimaryButtonColor,
      secondaryButtonLabel: hasSecondary ? ShieldConfiguration.Label(text: shieldSecondaryButtonLabel, color: shieldSubtitleColor) : nil
    )
  }

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    makeConfig(appName: application.localizedDisplayName ?? "This app")
  }

  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    makeConfig(appName: category.localizedDisplayName ?? "This category")
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    makeConfig(appName: webDomain.domain ?? "This website")
  }

  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
    makeConfig(appName: webDomain.domain ?? "This website")
  }
}
