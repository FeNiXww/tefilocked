package expo.modules.streakwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.RemoteViews

/**
 * Renders the streak card into a bitmap and pushes it into a single-ImageView
 * RemoteViews layout — RemoteViews can't draw the gradient hexagram/halo
 * itself, so [StreakWidgetRenderer] does that work up front.
 *
 * Android has no discrete widget-family picker like iOS's small/medium/large
 * — instead this is one resizable provider that redraws itself for the
 * placed size (see [sizeBucket]) whenever the user resizes it.
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
      for (id in ids) updateWidget(context, manager, id)
    }

    /** Loose Small/Medium/Large equivalent of iOS's widget families, from the placed cell size. */
    private fun sizeBucket(appWidgetManager: AppWidgetManager, appWidgetId: Int): StreakWidgetRenderer.WidgetSize {
      val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
      val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
      val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
      return when {
        minHeight >= 250 -> StreakWidgetRenderer.WidgetSize.LARGE
        minWidth >= 180 || minHeight >= 140 -> StreakWidgetRenderer.WidgetSize.MEDIUM
        else -> StreakWidgetRenderer.WidgetSize.SMALL
      }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val streak = prefs.getInt(KEY_STREAK, 0)
      val litToday = prefs.getBoolean(KEY_LIT_TODAY, false)
      val celebrating = prefs.getBoolean(KEY_CELEBRATING, false)
      val candles = (prefs.getString(KEY_CANDLES, "") ?: "")
        .split(",")
        .filter { it.isNotEmpty() }
        .map { it == "1" }

      val bucket = sizeBucket(appWidgetManager, appWidgetId)
      val bitmap = StreakWidgetRenderer.render(streak, litToday, candles, celebrating, bucket)
      val views = RemoteViews(context.packageName, R.layout.streak_widget)
      views.setImageViewBitmap(R.id.widget_image, bitmap)
      views.setContentDescription(
        R.id.widget_image,
        context.getString(
          if (litToday) R.string.streak_widget_content_desc_lit else R.string.streak_widget_content_desc_dormant,
          streak
        )
      )

      // Same scheme MainActivity's intent-filter already declares (see
      // AndroidManifest.xml) and the same `tefillok://pray` /
      // `tefillok://home` contract the iOS widget uses — routes through
      // RN Linking on the JS side (src/widgets/useWidgetDeepLink.ts) so a tap
      // while today's prayer is outstanding opens the prayer flow directly.
      val deepLinkUri = Uri.parse(if (litToday) "tefillok://home" else "tefillok://pray")
      val launchIntent = Intent(Intent.ACTION_VIEW, deepLinkUri).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      val pendingIntent = PendingIntent.getActivity(
        context,
        0,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.widget_image, pendingIntent)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }
}
