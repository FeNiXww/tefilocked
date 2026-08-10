package expo.modules.streakwidget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PointF
import android.graphics.RadialGradient
import android.graphics.LinearGradient
import android.graphics.Shader
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * Draws the widget onto a bitmap by hand — RemoteViews has no gradient/path
 * drawing of its own, so the whole card (halo, hexagram, streak text) is
 * composited here and dropped into the layout as a single ImageView.
 *
 * The hexagram geometry mirrors `hexagramPoints()` in
 * `src/components/MagenDavidStreak.tsx` exactly (same two triangles, same
 * -90/+90 start angles) so the widget reads as the same star as the in-app
 * hero visual, not a reinterpretation of it.
 */
object StreakWidgetRenderer {
  enum class WidgetSize { SMALL, MEDIUM, LARGE }

  private data class Tier(val minStreak: Int, val glowLayers: Int, val haloOpacity: Float, val haloReach: Float, val label: String)

  // Mirrors STREAK_TIERS in src/components/streakTiers.ts.
  private val TIERS = listOf(
    Tier(0, 1, 0.35f, 1.7f, "התחלה"),
    Tier(3, 2, 0.40f, 1.95f, "התמדה"),
    Tier(7, 2, 0.48f, 2.2f, "יציבות"),
    Tier(14, 3, 0.52f, 2.5f, "להט"),
    Tier(30, 3, 0.60f, 2.9f, "זוהר"),
  )

  private fun tierForStreak(streak: Int): Tier = TIERS.lastOrNull { streak >= it.minStreak } ?: TIERS[0]

  // src/theme/colors.ts
  private val ACCENT_LIGHT = Color.parseColor("#E4EFFA")
  private val ACCENT = Color.parseColor("#7FB2E5")
  private val ACCENT_DARK = Color.parseColor("#3E6E99")
  private val TEXT_PRIMARY = Color.parseColor("#16202E")
  private val TEXT_SECONDARY = Color.parseColor("#57616F")
  private val TEXT_MUTED = Color.parseColor("#666970")
  private val SURFACE_PRESSED = Color.parseColor("#EAE0C9")
  // src/components/HanukkiahStreakRow.tsx METAL — the app's one "warm gold" accent.
  private val GOLD = Color.parseColor("#D4A94A")
  private val GOLD_DARK = Color.parseColor("#8C6A24")

  private const val SIZE = 480

  fun render(streak: Int, litToday: Boolean, candles: List<Boolean>, celebrating: Boolean, sizeBucket: WidgetSize): Bitmap {
    // A taller canvas for Medium/Large so the extra rows have real room
    // instead of squeezing into the same square used for Small.
    val height = when (sizeBucket) {
      WidgetSize.SMALL -> SIZE
      WidgetSize.MEDIUM -> (SIZE * 1.18f).toInt()
      WidgetSize.LARGE -> (SIZE * 1.55f).toInt()
    }
    val bitmap = Bitmap.createBitmap(SIZE, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val tier = tierForStreak(streak)

    val cx = SIZE / 2f
    val starCenterY = SIZE * 0.40f
    val starRadius = SIZE * 0.20f

    if (litToday) drawHalo(canvas, cx, starCenterY, starRadius, tier, celebrating)
    drawStar(canvas, cx, starCenterY, starRadius, litToday, celebrating)
    var nextTop = drawLabel(canvas, cx, SIZE * 0.72f, streak, litToday)

    if (sizeBucket != WidgetSize.SMALL) {
      nextTop = drawStatusLine(canvas, cx, nextTop, litToday)
    }

    if (sizeBucket == WidgetSize.LARGE) {
      if (candles.isNotEmpty()) nextTop = drawCandleRow(canvas, cx, nextTop, candles)
      nextTop = drawTierLabel(canvas, cx, nextTop, tier)
      drawMotivationLine(canvas, cx, nextTop, litToday)
    }

    return bitmap
  }

  private fun hexagramPoints(cx: Float, cy: Float, r: Float, startAngleDeg: Float): List<PointF> =
    listOf(0f, 120f, 240f).map { offset ->
      val angle = Math.toRadians((startAngleDeg + offset).toDouble())
      PointF(cx + r * cos(angle).toFloat(), cy + r * sin(angle).toFloat())
    }

  private fun trianglePath(points: List<PointF>): Path {
    val path = Path()
    path.moveTo(points[0].x, points[0].y)
    path.lineTo(points[1].x, points[1].y)
    path.lineTo(points[2].x, points[2].y)
    path.close()
    return path
  }

  private fun withAlpha(color: Int, alpha: Int): Int =
    Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color))

  // The exact FLAME_OUTER/FLAME_INNER teardrop paths from src/components/Flame.tsx
  // (viewBox 0-100), scaled and centered at (cx, cy) within a `size`-wide square.
  private fun flameOuterPath(cx: Float, cy: Float, size: Float): Path {
    val left = cx - size / 2f
    val top = cy - size / 2f
    val s = size / 100f
    fun px(x: Float) = left + x * s
    fun py(y: Float) = top + y * s
    val path = Path()
    path.moveTo(px(50f), py(6f))
    path.cubicTo(px(74f), py(34f), px(88f), py(52f), px(84f), py(70f))
    path.cubicTo(px(81f), py(84f), px(68f), py(94f), px(50f), py(94f))
    path.cubicTo(px(32f), py(94f), px(19f), py(84f), px(16f), py(70f))
    path.cubicTo(px(12f), py(52f), px(26f), py(34f), px(50f), py(6f))
    path.close()
    return path
  }

  private fun flameInnerPath(cx: Float, cy: Float, size: Float): Path {
    val left = cx - size / 2f
    val top = cy - size / 2f
    val s = size / 100f
    fun px(x: Float) = left + x * s
    fun py(y: Float) = top + y * s
    val path = Path()
    path.moveTo(px(50f), py(34f))
    path.cubicTo(px(62f), py(50f), px(68f), py(60f), px(66f), py(70f))
    path.cubicTo(px(64f), py(80f), px(58f), py(86f), px(50f), py(86f))
    path.cubicTo(px(42f), py(86f), px(36f), py(80f), px(34f), py(70f))
    path.cubicTo(px(32f), py(60f), px(38f), py(50f), px(50f), py(34f))
    path.close()
    return path
  }

  /** One flame silhouette — same geometry/gradient as Flame.tsx, just static. */
  private fun drawFlame(canvas: Canvas, cx: Float, cy: Float, size: Float, alpha: Int) {
    val top = cy - size / 2f
    val bottom = cy + size / 2f

    val outerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      shader = LinearGradient(
        cx, top, cx, bottom,
        intArrayOf(withAlpha(ACCENT, alpha), withAlpha(ACCENT_DARK, alpha)),
        null,
        Shader.TileMode.CLAMP
      )
    }
    canvas.drawPath(flameOuterPath(cx, cy, size), outerPaint)

    val innerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      shader = LinearGradient(
        cx, top, cx, bottom,
        intArrayOf(withAlpha(Color.WHITE, alpha), withAlpha(ACCENT_LIGHT, alpha)),
        null,
        Shader.TileMode.CLAMP
      )
    }
    canvas.drawPath(flameInnerPath(cx, cy, size), innerPaint)
  }

  /** The same oversized, stacked, semi-transparent Flame silhouettes MagenDavidStreak.tsx's GlowLayer uses behind the star, scaled by streak tier same as the in-app hero. */
  private fun drawHalo(canvas: Canvas, cx: Float, cy: Float, starRadius: Float, tier: Tier, celebrating: Boolean) {
    val haloOpacity = if (celebrating) min(tier.haloOpacity * 1.35f, 0.85f) else tier.haloOpacity
    for (i in 0 until tier.glowLayers) {
      val scale = tier.haloReach * (1 - i * 0.28f)
      val size = starRadius * 3f * scale
      val alpha = (haloOpacity * (1 - i * 0.18f) * 255).toInt().coerceIn(0, 255)
      drawFlame(canvas, cx, cy, size, alpha)
    }

    if (celebrating) {
      val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = starRadius * 0.09f
        color = withAlpha(GOLD, 140)
      }
      canvas.drawCircle(cx, cy, starRadius * 1.1f, ringPaint)

      val sparklePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
      for (angleDeg in listOf(-100f, -35f, 15f, 75f, 145f, 205f)) {
        val angle = Math.toRadians(angleDeg.toDouble())
        val sx = cx + cos(angle).toFloat() * starRadius * 1.25f
        val sy = cy + sin(angle).toFloat() * starRadius * 1.25f
        canvas.drawCircle(sx, sy, starRadius * 0.045f, sparklePaint)
      }
    }
  }

  private fun drawStar(canvas: Canvas, cx: Float, cy: Float, r: Float, litToday: Boolean, celebrating: Boolean) {
    val triangleUp = trianglePath(hexagramPoints(cx, cy, r, -90f))
    val triangleDown = trianglePath(hexagramPoints(cx, cy, r, 90f))
    val baseStrokeWidth = r * 2f * 0.05f

    if (litToday) {
      val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = baseStrokeWidth * 1.9f
        strokeJoin = Paint.Join.ROUND
        shader = LinearGradient(
          cx, cy - r, cx, cy + r,
          intArrayOf(ACCENT_LIGHT, ACCENT, ACCENT_DARK),
          floatArrayOf(0f, 0.55f, 1f),
          Shader.TileMode.CLAMP
        )
      }
      canvas.drawPath(triangleUp, strokePaint)
      canvas.drawPath(triangleDown, strokePaint)

      // Faint glossy highlight filling the hollow center.
      val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader = RadialGradient(
          cx, cy, r * 0.55f,
          intArrayOf(withAlpha(Color.WHITE, 110), withAlpha(Color.WHITE, 0)),
          floatArrayOf(0f, 1f),
          Shader.TileMode.CLAMP
        )
      }
      canvas.drawCircle(cx, cy, r * 0.55f, highlightPaint)
    } else {
      val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = withAlpha(SURFACE_PRESSED, 153)
      }
      val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = baseStrokeWidth
        strokeJoin = Paint.Join.ROUND
        color = TEXT_MUTED
      }
      for (triangle in listOf(triangleUp, triangleDown)) {
        canvas.drawPath(triangle, fillPaint)
        canvas.drawPath(triangle, strokePaint)
      }
    }
  }

  /** Returns the y-coordinate just below the drawn text, for the next row to stack under. */
  private fun drawLabel(canvas: Canvas, cx: Float, top: Float, streak: Int, litToday: Boolean): Float {
    val numberPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      textAlign = Paint.Align.CENTER
      textSize = SIZE * 0.14f
      isFakeBoldText = true
      color = if (litToday) ACCENT_DARK else TEXT_PRIMARY
    }
    val captionPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      textAlign = Paint.Align.CENTER
      textSize = SIZE * 0.055f
      color = if (litToday) ACCENT_DARK else TEXT_SECONDARY
    }

    val numberBaseline = top + numberPaint.textSize * 0.8f
    canvas.drawText(streak.toString(), cx, numberBaseline, numberPaint)
    val captionBaseline = numberBaseline + captionPaint.textSize * 1.6f
    canvas.drawText("ימי רצף", cx, captionBaseline, captionPaint)
    return captionBaseline + SIZE * 0.05f
  }

  private fun drawStatusLine(canvas: Canvas, cx: Float, top: Float, litToday: Boolean): Float {
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      textAlign = Paint.Align.CENTER
      textSize = SIZE * 0.05f
      isFakeBoldText = true
      color = if (litToday) ACCENT_DARK else TEXT_SECONDARY
    }
    val text = if (litToday) "התפילה של היום נרשמה" else "מוכן לרגע של תפילה?"
    val baseline = top + paint.textSize * 0.8f
    canvas.drawText(text, cx, baseline, paint)
    return baseline + SIZE * 0.05f
  }

  /** Up to 9 dots — oldest day first, today last (rightmost, larger), mirroring `getStreakCandles()`. */
  private fun drawCandleRow(canvas: Canvas, cx: Float, top: Float, candles: List<Boolean>): Float {
    val dotSpacing = SIZE * 0.075f
    val dotRadius = SIZE * 0.018f
    val todayRadius = SIZE * 0.023f
    val totalWidth = dotSpacing * (candles.size - 1)
    val startX = cx + totalWidth / 2f // rightmost = oldest reading position 0 in RTL layout
    val centerY = top + todayRadius

    candles.forEachIndexed { index, completed ->
      val isToday = index == candles.size - 1
      val x = startX - dotSpacing * index
      val radius = if (isToday) todayRadius else dotRadius
      val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = if (completed) GOLD else withAlpha(SURFACE_PRESSED, 180)
        if (completed) {
          shader = LinearGradient(
            x, centerY - radius, x, centerY + radius,
            intArrayOf(GOLD, GOLD_DARK),
            null,
            Shader.TileMode.CLAMP
          )
        }
      }
      canvas.drawCircle(x, centerY, radius, paint)
      if (isToday) {
        val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
          style = Paint.Style.STROKE
          strokeWidth = SIZE * 0.004f
          color = withAlpha(GOLD_DARK, 130)
        }
        canvas.drawCircle(x, centerY, radius, ringPaint)
      }
    }
    return centerY + todayRadius + SIZE * 0.06f
  }

  private fun drawTierLabel(canvas: Canvas, cx: Float, top: Float, tier: Tier): Float {
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      textAlign = Paint.Align.CENTER
      textSize = SIZE * 0.042f
      isFakeBoldText = true
      letterSpacing = 0.05f
      color = ACCENT_DARK
    }
    val baseline = top + paint.textSize * 0.8f
    canvas.drawText(tier.label, cx, baseline, paint)
    return baseline + SIZE * 0.05f
  }

  private fun drawMotivationLine(canvas: Canvas, cx: Float, top: Float, litToday: Boolean) {
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      textAlign = Paint.Align.CENTER
      textSize = SIZE * 0.045f
      color = TEXT_SECONDARY
    }
    val text = if (litToday) "כל יום מחזק את הקשר שלך" else "שמור על הרצף שלך"
    canvas.drawText(text, cx, top + paint.textSize * 0.8f, paint)
  }
}
