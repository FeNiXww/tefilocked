package expo.modules.streakwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.util.SizeF
import android.widget.RemoteViews

/**
 * Builds the streak card as real `RemoteViews` (native text + vector
 * artwork — see [StreakWidgetRenderer]) and pushes them to every placed
 * instance.
 *
 * Android has no discrete widget-family picker like iOS's small/medium/large.
 * On Android 12+ this registers all three deliberately-designed compositions
 * via the size-keyed `RemoteViews` constructor, and the OS itself picks
 * (and live-swaps) the best match as the widget is placed/resized — no
 * process wakeup required. Below API 31 that constructor doesn't exist, so
 * [sizeBucket] falls back to reading the placed cell size once and building
 * just that one layout, same as before.
 */
class StreakWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (id in appWidgetIds) updateWidget(context, appWidgetManager, id)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle
  ) {
    updateWidget(context, appWidgetManager, appWidgetId)
  }

  companion object {
    private const val PREFS_NAME = "streak_widget_prefs"
    private const val KEY_STREAK = "streak"
    private const val KEY_LIT_TODAY = "lit_today"
    private const val KEY_CANDLES = "candles"
    private const val KEY_CELEBRATING = "celebrating"

    /** Persists the latest streak so the provider can redraw without the app running. */
    fun writeStreak(context: Context, streak: Int, litToday: Boolean, candlesCsv: String, celebrating: Boolean) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
        .putInt(KEY_STREAK, streak)
        .putBoolean(KEY_LIT_TODAY, litToday)
        .putString(KEY_CANDLES, candlesCsv)
        .putBoolean(KEY_CELEBRATING, celebrating)
        .apply()
    }

    /** Redraws every placed instance of this widget right away, instead of waiting for the ~30min system update cycle. */
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, StreakWidgetProvider::class.java))
      for (id in ids) {
        // `updateAppWidget` is a Binder call the OS can reject (e.g.
        // IllegalArgumentException when the rendered bitmap exceeds the
        // device's RemoteViews memory ceiling) — this is a decorative
        // home-screen redraw, not something the app's own UI should ever
        // crash over, and one bad/oversized widget instance shouldn't stop
        // the rest of the user's placed widgets from updating either.
        try {
          updateWidget(context, manager, id)
        } catch (e: Exception) {
          Log.w("StreakWidget", "Failed to update widget $id", e)
        }
      }
    }

    /** Loose Small/Tall/Medium/Large equivalent of iOS's widget families, from the placed cell size — same "largest fitting composition" rule as the API 31+ map below, worked out by hand for older devices. */
    private fun sizeBucket(appWidgetManager: AppWidgetManager, appWidgetId: Int): StreakWidgetRenderer.WidgetSize {
      val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
      val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
      val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
      return when {
        minWidth >= 180 && minHeight >= 250 -> StreakWidgetRenderer.WidgetSize.LARGE
        minWidth >= 180 -> StreakWidgetRenderer.WidgetSize.MEDIUM
        minHeight >= 190 -> StreakWidgetRenderer.WidgetSize.TALL
        else -> StreakWidgetRenderer.WidgetSize.SMALL
      }
    }

    // Minimum dp each composition needs to render without clipping — see the
    // four streak_widget_*.xml layouts. Registered with the API 31 size-keyed
    // RemoteViews constructor, which picks the largest-area entry that still
    // fits the widget's actual placed size (docs: "the largest View whose
    // width and height are both <= the available space") — Android's own
    // default drag size (2x3, narrow-and-tall) lands on Tall this way instead
    // of Small stretched across empty vertical space.
    //
    // LARGE_SIZE must match android:maxResizeWidth/maxResizeHeight in
    // streak_widget_info.xml exactly. If the manifest ever allows resizing
    // past this, the OS keeps rendering LARGE (still the biggest entry that
    // fits) inside the bigger cell, leaving dead space around the fixed
    // composition instead of actually scaling into it.
    private val SMALL_SIZE = SizeF(110f, 110f)
    private val TALL_SIZE = SizeF(110f, 190f)
    private val MEDIUM_SIZE = SizeF(180f, 110f)
    private val LARGE_SIZE = SizeF(180f, 250f)

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val streak = prefs.getInt(KEY_STREAK, 0)
      val litToday = prefs.getBoolean(KEY_LIT_TODAY, false)
      val celebrating = prefs.getBoolean(KEY_CELEBRATING, false)
      val candles = (prefs.getString(KEY_CANDLES, "") ?: "")
        .split(",")
        .filter { it.isNotEmpty() }
        .map { it == "1" }

      val contentDescription = context.getString(
        if (litToday) R.string.streak_widget_content_desc_lit else R.string.streak_widget_content_desc_dormant,
        streak
      )
      val pendingIntent = launchPendingIntent(context, litToday)

      fun build(bucket: StreakWidgetRenderer.WidgetSize): RemoteViews {
        val views = StreakWidgetRenderer.build(context, streak, litToday, candles, celebrating, bucket)
        views.setContentDescription(R.id.widget_root, contentDescription)
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
        return views
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val sizedViews = mapOf(
          SMALL_SIZE to build(StreakWidgetRenderer.WidgetSize.SMALL),
          TALL_SIZE to build(StreakWidgetRenderer.WidgetSize.TALL),
          MEDIUM_SIZE to build(StreakWidgetRenderer.WidgetSize.MEDIUM),
          LARGE_SIZE to build(StreakWidgetRenderer.WidgetSize.LARGE),
        )
        appWidgetManager.updateAppWidget(appWidgetId, RemoteViews(sizedViews))
      } else {
        val bucket = sizeBucket(appWidgetManager, appWidgetId)
        appWidgetManager.updateAppWidget(appWidgetId, build(bucket))
      }
    }

    // Same scheme MainActivity's intent-filter already declares (see
    // AndroidManifest.xml) and the same `tefillok://pray` / `tefillok://home`
    // contract the iOS widget uses — routes through RN Linking on the JS side
    // (src/widgets/useWidgetDeepLink.ts) so a tap while today's prayer is
    // outstanding opens the prayer flow directly.
    private fun launchPendingIntent(context: Context, litToday: Boolean): PendingIntent {
      val deepLinkUri = Uri.parse(if (litToday) "tefillok://home" else "tefillok://pray")
      val launchIntent = Intent(Intent.ACTION_VIEW, deepLinkUri).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      return PendingIntent.getActivity(
        context,
        0,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
  }
}
