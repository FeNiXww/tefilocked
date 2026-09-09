import SwiftUI
import WidgetKit

// Same App Group the main app writes to via
// `new ExtensionStorage(IOS_APP_GROUP)` in src/widgets/syncStreakWidget.ts
// (src/constants/appGroup.ts is the single source of truth for this string —
// keep both in sync if it ever changes).
private let appGroupIdentifier = "group.org.tefillok.app.blocker"

// src/theme/colors.ts — the app's real light/parchment/navy brand, not a
// bespoke "widget theme". A user should recognize this as the same surface
// the app itself sits on, just purpose-composed for a home-screen tile.
private let accentLight = Color(red: 0.894, green: 0.937, blue: 0.980) // #E4EFFA
private let accent = Color(red: 0.498, green: 0.698, blue: 0.898) // #7FB2E5
private let accentDark = Color(red: 0.243, green: 0.431, blue: 0.600) // #3E6E99
private let textPrimary = Color(red: 0.086, green: 0.125, blue: 0.180) // #16202E
private let textSecondary = Color(red: 0.341, green: 0.380, blue: 0.435) // #57616F
private let textMuted = Color(red: 0.400, green: 0.412, blue: 0.439) // #666970
private let surfacePressed = Color(red: 0.918, green: 0.878, blue: 0.788) // #EAE0C9
private let border = Color(red: 0.906, green: 0.875, blue: 0.788) // #E7DFC9
private let widgetBackgroundTop = Color(red: 1.0, green: 0.992, blue: 0.976) // #FFFDF9
private let widgetBackgroundBottom = Color(red: 0.965, green: 0.945, blue: 0.902) // #F6F1E6
// src/components/HanukkiahStreakRow.tsx METAL — the app's one "warm gold"
// accent (the חנוכייה's brass), reused here for the large widget's weekly dots.
private let gold = Color(red: 0.831, green: 0.663, blue: 0.290) // #D4A94A
private let goldDark = Color(red: 0.549, green: 0.416, blue: 0.145) // #8C6A24

// MARK: - Streak tiers
// Thresholds/labels mirror STREAK_TIERS in src/components/streakTiers.ts.
// `haloReach` is deliberately smaller than the in-app hero's (up to 2.9x
// there) — that value was tuned for a big card with generous surrounding
// whitespace; on a widget tile the same reach would bleed the glow into the
// rounded corners, which is exactly the "excessive glow" this redesign is
// meant to avoid. These are the same dialed-down reach values the Android
// widget's tier artwork uses, so a given streak reads at the same visual
// intensity on both platforms.

private struct WidgetTier {
  let minStreak: Int
  let glowLayers: Int
  let haloOpacity: Double
  let haloReach: CGFloat
  let label: String
}

private let widgetTiers: [WidgetTier] = [
  WidgetTier(minStreak: 0, glowLayers: 1, haloOpacity: 0.35, haloReach: 1.5, label: "התחלה"),
  WidgetTier(minStreak: 3, glowLayers: 2, haloOpacity: 0.40, haloReach: 1.7, label: "התמדה"),
  WidgetTier(minStreak: 7, glowLayers: 2, haloOpacity: 0.48, haloReach: 1.85, label: "יציבות"),
  WidgetTier(minStreak: 14, glowLayers: 3, haloOpacity: 0.52, haloReach: 2.0, label: "להט"),
  WidgetTier(minStreak: 30, glowLayers: 3, haloOpacity: 0.60, haloReach: 2.15, label: "זוהר"),
]

private func tier(forStreak streak: Int) -> WidgetTier {
  widgetTiers.last(where: { streak >= $0.minStreak }) ?? widgetTiers[0]
}

// MARK: - Timeline

struct StreakEntry: TimelineEntry {
  let date: Date
  let streak: Int
  let litToday: Bool
  let candles: [Bool]
  let celebrating: Bool
}

struct StreakProvider: TimelineProvider {
  private func readEntry() -> StreakEntry {
    let defaults = UserDefaults(suiteName: appGroupIdentifier)
    let streak = defaults?.integer(forKey: "streak") ?? 0
    let litToday = (defaults?.integer(forKey: "litToday") ?? 0) == 1
    let celebrating = (defaults?.integer(forKey: "celebrating") ?? 0) == 1
    let candlesCsv = defaults?.string(forKey: "candles") ?? ""
    let candles = candlesCsv.isEmpty ? [] : candlesCsv.split(separator: ",").map { $0 == "1" }
    return StreakEntry(date: Date(), streak: streak, litToday: litToday, candles: candles, celebrating: celebrating)
  }

  func placeholder(in context: Context) -> StreakEntry {
    StreakEntry(date: Date(), streak: 5, litToday: true, candles: [true, true, true, true, true], celebrating: false)
  }

  func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
    completion(readEntry())
  }

  // A single entry with `.never` — the app pushes fresh data itself via
  // `ExtensionStorage.reloadWidget()` every time the streak changes
  // (see src/screens/Home/index.tsx), so there's nothing to compute on a timer.
  func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
    completion(Timeline(entries: [readEntry()], policy: .never))
  }
}

// MARK: - Magen David geometry
// Mirrors `hexagramPoints()` in src/components/MagenDavidStreak.tsx exactly:
// two triangles, offsets 0/120/240°, rotated to start at -90°/+90° — same
// star, same math, just SwiftUI instead of react-native-svg.

private func hexagramPoints(cx: CGFloat, cy: CGFloat, r: CGFloat, startAngleDeg: CGFloat) -> [CGPoint] {
  [0, 120, 240].map { offset in
    let angle = (startAngleDeg + offset) * .pi / 180
    return CGPoint(x: cx + r * cos(angle), y: cy + r * sin(angle))
  }
}

private func trianglePath(_ points: [CGPoint]) -> Path {
  var path = Path()
  path.move(to: points[0])
  path.addLine(to: points[1])
  path.addLine(to: points[2])
  path.closeSubpath()
  return path
}

private struct HexagramShape: Shape {
  let startAngleDeg: CGFloat

  func path(in rect: CGRect) -> Path {
    let r = min(rect.width, rect.height) * 0.42
    let cx = rect.midX
    let cy = rect.midY
    return trianglePath(hexagramPoints(cx: cx, cy: cy, r: r, startAngleDeg: startAngleDeg))
  }
}

// MARK: - Flame geometry
// The exact FLAME_OUTER/FLAME_INNER teardrop paths from src/components/Flame.tsx
// (viewBox 0-100), so the widget's halo reads as the same blue flame used
// everywhere else in the app instead of a generic blurred blob. Static here —
// Flame.tsx's sway/flicker is a continuous Reanimated loop, which neither
// WidgetKit nor RemoteViews can run; the crisp silhouette + gradient is what
// actually reads as "flame" even standing still.

private func scaled(_ x: CGFloat, _ y: CGFloat, in rect: CGRect) -> CGPoint {
  CGPoint(x: rect.minX + x / 100 * rect.width, y: rect.minY + y / 100 * rect.height)
}

private struct FlameOuterShape: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    p.move(to: scaled(50, 6, in: rect))
    p.addCurve(to: scaled(84, 70, in: rect), control1: scaled(74, 34, in: rect), control2: scaled(88, 52, in: rect))
    p.addCurve(to: scaled(50, 94, in: rect), control1: scaled(81, 84, in: rect), control2: scaled(68, 94, in: rect))
    p.addCurve(to: scaled(16, 70, in: rect), control1: scaled(32, 94, in: rect), control2: scaled(19, 84, in: rect))
    p.addCurve(to: scaled(50, 6, in: rect), control1: scaled(12, 52, in: rect), control2: scaled(26, 34, in: rect))
    p.closeSubpath()
    return p
  }
}

private struct FlameInnerShape: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    p.move(to: scaled(50, 34, in: rect))
    p.addCurve(to: scaled(66, 70, in: rect), control1: scaled(62, 50, in: rect), control2: scaled(68, 60, in: rect))
    p.addCurve(to: scaled(50, 86, in: rect), control1: scaled(64, 80, in: rect), control2: scaled(58, 86, in: rect))
    p.addCurve(to: scaled(34, 70, in: rect), control1: scaled(42, 86, in: rect), control2: scaled(36, 80, in: rect))
    p.addCurve(to: scaled(50, 34, in: rect), control1: scaled(32, 60, in: rect), control2: scaled(38, 50, in: rect))
    p.closeSubpath()
    return p
  }
}

private struct FlameGlyph: View {
  var body: some View {
    ZStack {
      FlameOuterShape()
        .fill(LinearGradient(colors: [accent, accentDark], startPoint: .top, endPoint: .bottom))
      FlameInnerShape()
        .fill(LinearGradient(colors: [Color.white, accentLight], startPoint: .top, endPoint: .bottom))
    }
  }
}

// MARK: - Star + halo

private struct MagenDavidView: View {
  let litToday: Bool
  let tier: WidgetTier
  let celebrating: Bool

  var body: some View {
    GeometryReader { geo in
      let size = min(geo.size.width, geo.size.height)
      let strokeWidth = max(size * 0.052, 1.6)
      let haloOpacity = celebrating ? min(tier.haloOpacity * 1.35, 0.85) : tier.haloOpacity

      ZStack {
        if litToday {
          // The same oversized, stacked, semi-transparent Flame silhouettes
          // MagenDavidStreak.tsx's GlowLayer uses behind the star — layer
          // count scales with the streak tier exactly like the in-app hero,
          // just with a tighter reach (see widgetTiers above).
          ForEach(0..<tier.glowLayers, id: \.self) { i in
            let scale = tier.haloReach * (1 - CGFloat(i) * 0.28)
            FlameGlyph()
              .opacity(haloOpacity * (1 - Double(i) * 0.18))
              .frame(width: size * 0.75 * scale, height: size * 0.75 * scale)
          }

          // One-shot "just completed" accent: a brief gold ring + a few
          // sparkle motes standing in for the app's twinkle/pop animation
          // (WidgetKit has no custom animation timeline — this frame is
          // shown for ~1s via a second push from celebrateStreakWidget()
          // before the widget settles back to the plain lit state).
          if celebrating {
            Circle()
              .stroke(gold.opacity(0.55), lineWidth: strokeWidth * 0.85)
              .frame(width: size * 1.15, height: size * 1.15)
            ForEach(Array(sparkleAngles.enumerated()), id: \.offset) { _, angleDeg in
              let angle = angleDeg * .pi / 180
              Circle()
                .fill(Color.white)
                .frame(width: size * 0.05, height: size * 0.05)
                .offset(x: cos(angle) * size * 0.66, y: sin(angle) * size * 0.66)
            }
          }
        }

        if litToday {
          HexagramShape(startAngleDeg: -90)
            .stroke(
              LinearGradient(colors: [accentLight, accent, accentDark], startPoint: .top, endPoint: .bottom),
              style: StrokeStyle(lineWidth: strokeWidth * 1.9, lineJoin: .round)
            )
          HexagramShape(startAngleDeg: 90)
            .stroke(
              LinearGradient(colors: [accentLight, accent, accentDark], startPoint: .top, endPoint: .bottom),
              style: StrokeStyle(lineWidth: strokeWidth * 1.9, lineJoin: .round)
            )
          // Faint glossy highlight filling the hollow center — the widget's
          // one "soft inner lighting" touch, scaled by tier like the in-app
          // hero's highlightOpacity so higher streaks read as more radiant.
          Circle()
            .fill(
              RadialGradient(
                colors: [Color.white.opacity(0.1 + Double(tier.glowLayers) * 0.05), Color.white.opacity(0)],
                center: .center,
                startRadius: 0,
                endRadius: size * 0.28
              )
            )
            .frame(width: size * 0.55, height: size * 0.55)
        } else {
          ForEach([-90, 90] as [CGFloat], id: \.self) { angle in
            HexagramShape(startAngleDeg: angle)
              .fill(surfacePressed.opacity(0.55))
            HexagramShape(startAngleDeg: angle)
              .stroke(textMuted, style: StrokeStyle(lineWidth: strokeWidth, lineJoin: .round))
          }
        }
      }
      .frame(width: geo.size.width, height: geo.size.height)
    }
  }

  private var sparkleAngles: [CGFloat] { [-100, -35, 15, 75, 145, 205] }
}

// MARK: - Weekly candle row (large widget only)
// Deliberately plain gold dots rather than the full ornate חנוכייה geometry
// (metal arms, individual wax candles) — that much detail doesn't survive
// being shrunk to widget scale without turning into visual noise; the star
// stays the one "hero" glyph, and this row evokes the week's rhythm without
// competing with it.

private struct CandleRow: View {
  let candles: [Bool]

  var body: some View {
    HStack(spacing: 6) {
      ForEach(Array(candles.enumerated()), id: \.offset) { index, completed in
        let isToday = index == candles.count - 1
        Circle()
          .fill(completed ? AnyShapeStyle(LinearGradient(colors: [gold, goldDark], startPoint: .top, endPoint: .bottom)) : AnyShapeStyle(surfacePressed.opacity(0.65)))
          .frame(width: isToday ? 10 : 7, height: isToday ? 10 : 7)
          .overlay(
            Circle().stroke(isToday ? goldDark.opacity(0.5) : Color.clear, lineWidth: 1)
          )
      }
    }
  }
}

// MARK: - Widget view

struct StreakWidgetEntryView: View {
  var entry: StreakProvider.Entry
  @Environment(\.widgetFamily) private var family

  private var tierInfo: WidgetTier { tier(forStreak: entry.streak) }

  private var statusLine: String {
    entry.litToday ? "התפילה של היום נרשמה" : "מוכן לרגע של תפילה?"
  }

  private var deepLinkURL: URL? {
    URL(string: entry.litToday ? "tefillok://home" : "tefillok://pray")
  }

  private var numberColor: Color { entry.litToday ? accentDark : textPrimary }
  private var secondaryColor: Color { entry.litToday ? accentDark : textSecondary }

  private var streakNumber: some View {
    Text("\(entry.streak)")
      .font(.system(size: numberSize, weight: .heavy, design: .rounded))
      .foregroundColor(numberColor)
  }

  private var caption: some View {
    Text("ימי רצף")
      .font(.system(size: 12, weight: .medium))
      .foregroundColor(secondaryColor)
  }

  private var numberSize: CGFloat {
    switch family {
    case .systemLarge: return 44
    case .systemMedium: return 30
    default: return 32
    }
  }

  // SMALL: the glanceable minimum — star + count, nothing else. Answers
  // "where am I right now" in under a second.
  private var smallLayout: some View {
    VStack(spacing: 6) {
      MagenDavidView(litToday: entry.litToday, tier: tierInfo, celebrating: entry.celebrating)
        .frame(width: 62, height: 62)
      streakNumber
      caption
    }
  }

  // MEDIUM: the extra width buys a horizontal composition, not a bigger
  // Small — star leads (SwiftUI auto-mirrors leading/trailing under the
  // forced RTL environment below, so it lands on the right), number +
  // status trail it in natural Hebrew reading order.
  private var mediumLayout: some View {
    HStack(spacing: 16) {
      MagenDavidView(litToday: entry.litToday, tier: tierInfo, celebrating: entry.celebrating)
        .frame(width: 72, height: 72)
      VStack(alignment: .trailing, spacing: 3) {
        HStack(alignment: .lastTextBaseline, spacing: 5) {
          streakNumber
          caption
        }
        Text(statusLine)
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(secondaryColor)
          .lineLimit(1)
          .minimumScaleFactor(0.85)
      }
    }
  }

  // LARGE: the one composition with room to tell the whole story — star,
  // count, status, the week's candles, and the current tier name —
  // generously spaced rather than Medium's content stretched taller.
  private var largeLayout: some View {
    VStack(spacing: 10) {
      MagenDavidView(litToday: entry.litToday, tier: tierInfo, celebrating: entry.celebrating)
        .frame(width: 112, height: 112)
      VStack(spacing: 2) {
        streakNumber
        caption
      }
      Text(statusLine)
        .font(.system(size: 14, weight: .semibold))
        .foregroundColor(secondaryColor)
        .lineLimit(1)
        .minimumScaleFactor(0.85)
      if !entry.candles.isEmpty {
        CandleRow(candles: entry.candles)
          .padding(.top, 4)
      }
      Text(tierInfo.label)
        .font(.system(size: 12, weight: .bold))
        .tracking(0.6)
        .foregroundColor(accentDark)
        .padding(.top, 2)
    }
  }

  private var content: some View {
    Group {
      switch family {
      case .systemLarge: largeLayout
      case .systemMedium: mediumLayout
      default: smallLayout
      }
    }
    .padding(.horizontal, family == .systemSmall ? 12 : 18)
    .padding(.vertical, family == .systemLarge ? 20 : 14)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .environment(\.layoutDirection, .rightToLeft) // App is Hebrew-first/RTL throughout, regardless of device locale.
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(entry.streak) ימי רצף. \(statusLine)")
  }

  private var background: some View {
    LinearGradient(colors: [widgetBackgroundTop, widgetBackgroundBottom], startPoint: .top, endPoint: .bottom)
  }

  var body: some View {
    Group {
      if #available(iOS 17.0, *) {
        content.containerBackground(for: .widget) { background }
      } else {
        content.background(background)
      }
    }
    .widgetURL(deepLinkURL)
  }
}

// MARK: - Widget

struct StreakWidget: Widget {
  let kind: String = "StreakWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
      StreakWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("רצף תפילה")
    .description("הרצף היומי שלך של תפילה")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

@main
struct StreakWidgetBundle: WidgetBundle {
  var body: some Widget {
    StreakWidget()
  }
}
