package expo.modules.streakwidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class StreakWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("StreakWidget")

    Function("updateAndroid") { streak: Int, litToday: Boolean, candlesCsv: String, celebrating: Boolean ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      StreakWidgetProvider.writeStreak(context, streak, litToday, candlesCsv, celebrating)
      StreakWidgetProvider.updateAll(context)
    }

    // The launcher-level "pin to home screen" prompt (Android 8+ only —
    // older launchers have no equivalent API, the user just has to use the
    // normal long-press-and-drag widget picker).
    Function("isPinWidgetSupported") {
      val context = appContext.reactContext ?: return@Function false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function false
      AppWidgetManager.getInstance(context).isRequestPinAppWidgetSupported
    }

    // Returns whether the OS accepted the request and handed off to the
    // launcher's own confirmation UI — not whether the user actually
    // finished placing it (there's no callback for that we need here; the
    // next syncStreakWidget() push will populate it whenever it lands).
    Function("requestPinWidget") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function false
      val appWidgetManager = AppWidgetManager.getInstance(context)
      if (!appWidgetManager.isRequestPinAppWidgetSupported) return@Function false
      val provider = ComponentName(context, StreakWidgetProvider::class.java)
      appWidgetManager.requestPinAppWidget(provider, null, null)
    }
  }
}
