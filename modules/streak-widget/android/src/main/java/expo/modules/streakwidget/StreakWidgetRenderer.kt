package expo.modules.streakwidget

import android.content.Context
import android.view.View
import android.widget.RemoteViews

/**
 * Builds the widget's [RemoteViews] tree for a given size bucket — real
 * `TextView`s for every string and a `VectorDrawable` for the star/halo
 * artwork, so nothing is ever rasterized into a single stretched bitmap.
 * The old implementation (see git history) drew the entire card — including
 * the streak number and every label — onto one fixed 320px `Canvas` and
 * dropped it into a single `ImageView`; that's what made text and edges go
 * soft the moment a launcher displayed the widget at anything other than
 * that exact pixel size. Every element below is either native text or a
 * vector asset, both of which render crisply at whatever dp size the
 * layout gives them.
 *
 * The hexagram/flame geometry baked into the `streak_star_lit_tier*` and
 * `streak_star_dormant` vector drawables mirrors `hexagramPoints()` /
 * `FLAME_OUTER`/`FLAME_INNER` in `src/components/MagenDavidStreak.tsx` and
 * `Flame.tsx` exactly (see `scripts` used to generate them) — same star,
 * same flame, just pre-rendered as path data instead of drawn per-frame.
 */
object StreakWidgetRenderer {
  // TALL covers Android's own default drag size (narrow width, a lot of
  // height) — not a discrete iOS-style family, just the one extra
  // composition needed so that common shape doesn't fall back to Small
  // stretched across empty vertical space. See streak_widget_tall.xml.
  enum class WidgetSize { SMALL, TALL, MEDIUM, LARGE }

  private data class Tier(val minStreak: Int, val label: String, val starRes: Int)

  // Mirrors STREAK_TIERS in src/components/streakTiers.ts (thresholds/labels
  // only — the glow math itself is baked into the tier drawables at
  // generation time, tuned down from the in-app hero's halo reach since a
  // widget tile has far less room before the glow would bleed into the
  // card's rounded corners).
  private val TIERS = listOf(
    Tier(0, "התחלה", R.drawable.streak_star_lit_tier0),
    Tier(3, "התמדה", R.drawable.streak_star_lit_tier1),
    Tier(7, "יציבות", R.drawable.streak_star_lit_tier2),
    Tier(14, "להט", R.drawable.streak_star_lit_tier3),
    Tier(30, "זוהר", R.drawable.streak_star_lit_tier4),
  )

  private fun tierForStreak(streak: Int): Tier = TIERS.lastOrNull { streak >= it.minStreak } ?: TIERS[0]

  private const val STATUS_LIT = "התפילה של היום נרשמה"
  private const val STATUS_DORMANT = "מוכן לרגע של תפילה?"

  private val LAYOUT_FOR_SIZE = mapOf(
    WidgetSize.SMALL to R.layout.streak_widget_small,
    WidgetSize.TALL to R.layout.streak_widget_tall,
    WidgetSize.MEDIUM to R.layout.streak_widget_medium,
    WidgetSize.LARGE to R.layout.streak_widget_large,
  )

  fun build(
    context: Context,
    streak: Int,
    litToday: Boolean,
    candles: List<Boolean>,
    celebrating: Boolean,
    sizeBucket: WidgetSize
  ): RemoteViews {
    val views = RemoteViews(context.packageName, LAYOUT_FOR_SIZE.getValue(sizeBucket))
    val tier = tierForStreak(streak)

    // Resolved from values/colors.xml + values-night/colors.xml (mirrors
    // src/theme/colors.ts light/dark) rather than hardcoded ints, so this
    // follows the system's day/night setting the same way the app does.
    val accentDarkColor = context.getColor(R.color.widget_accent_dark)
    val textPrimaryColor = context.getColor(R.color.widget_text_primary)
    val textSecondaryColor = context.getColor(R.color.widget_text_secondary)
    val primaryColor = if (litToday) accentDarkColor else textPrimaryColor
    val secondaryColor = if (litToday) accentDarkColor else textSecondaryColor

    views.setTextViewText(R.id.widget_streak_number, streak.toString())
    views.setTextColor(R.id.widget_streak_number, primaryColor)
    views.setTextColor(R.id.widget_streak_caption, secondaryColor)

    views.setImageViewResource(R.id.widget_star_image, if (litToday) tier.starRes else R.drawable.streak_star_dormant)
    views.setViewVisibility(R.id.widget_celebrate_overlay, if (litToday && celebrating) View.VISIBLE else View.GONE)

    if (sizeBucket != WidgetSize.SMALL) {
      views.setTextViewText(R.id.widget_status_line, if (litToday) STATUS_LIT else STATUS_DORMANT)
      views.setTextColor(R.id.widget_status_line, secondaryColor)
    }

    if (sizeBucket == WidgetSize.LARGE) {
      populateCandleRow(context, views, candles)
      views.setTextViewText(R.id.widget_tier_label, tier.label)
    }

    return views
  }

  /**
   * Up to 9 dots, oldest day first / today last in the data (mirrors
   * `getStreakCandles()`). Today is added *first* so it lands at the
   * container's layout-direction start edge — the rightmost, largest dot —
   * with earlier days trailing to its left, matching the RTL reading order
   * the rest of the app uses everywhere a day-of-week row appears.
   */
  private fun populateCandleRow(context: Context, views: RemoteViews, candles: List<Boolean>) {
    views.removeAllViews(R.id.widget_candle_row)
    val lastIndex = candles.size - 1
    for (index in lastIndex downTo 0) {
      val isToday = index == lastIndex
      val completed = candles[index]
      val dotLayout = when {
        completed && isToday -> R.layout.streak_candle_dot_lit_today
        completed -> R.layout.streak_candle_dot_lit
        isToday -> R.layout.streak_candle_dot_dormant_today
        else -> R.layout.streak_candle_dot_dormant
      }
      views.addView(R.id.widget_candle_row, RemoteViews(context.packageName, dotLayout))
    }
  }
}
