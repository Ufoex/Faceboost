package com.eepiemi.materialbook.utils

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.PixelCopy
import android.view.View
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import com.multiplatform.webview.web.WebViewNavigator
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import kotlin.concurrent.thread
import kotlin.coroutines.resume

/**
 * The last feed, kept as a small picture and shown while the real one loads at the next start: Facebook sends the first
 * posts ~4 s after the page opens (its data comes through a WebSocket and the posts are drawn only when the big frame
 * arrives), so the screen would otherwise be the story tray and grey placeholders. The picture goes away, fading, as soon
 * as the page has its posts.
 *
 * It lives in the app's private cache, one file, taken once per run when the feed is at the top and loaded. It is not
 * kept with App lock on (the lock screen is drawn over the page) and is deleted on logging out.
 */
object FeedSnapshot {
    private const val PREFIX = "feed_snapshot"
    private const val MAX_AGE_MS = 14L * 24 * 60 * 60 * 1000
    private const val WIDTH_PX = 540

    /** True once this run has saved one (it is taken once per run). */
    @Volatile var savedThisRun = false

    private fun files(context: Context): List<File> =
        context.cacheDir.listFiles { f -> f.name.startsWith(PREFIX) && f.name.endsWith(".jpg") }.orEmpty().toList()

    fun clear(context: Context) {
        files(context).forEach { it.delete() }
    }

    /** The saved picture, or null: none, too old, or unreadable. */
    fun load(context: Context): ImageBitmap? {
        val file = files(context).maxByOrNull { it.lastModified() } ?: return null
        if (System.currentTimeMillis() - file.lastModified() > MAX_AGE_MS) { clear(context); return null }
        return runCatching { BitmapFactory.decodeFile(file.path)?.asImageBitmap() }.getOrNull()
    }

    /** Copies what [view] shows on screen (PixelCopy: it also works for the WebView's hardware layers) and saves it. */
    fun capture(activity: Activity, view: View) {
        val w = view.width
        val h = view.height
        if (w <= 0 || h <= 0 || !view.isShown) return
        val loc = IntArray(2)
        view.getLocationInWindow(loc)
        val scale = minOf(1f, WIDTH_PX.toFloat() / w)
        val bitmap = Bitmap.createBitmap((w * scale).toInt().coerceAtLeast(1), (h * scale).toInt().coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        runCatching {
            PixelCopy.request(activity.window, Rect(loc[0], loc[1], loc[0] + w, loc[1] + h), bitmap, { result ->
                if (result != PixelCopy.SUCCESS) { Log.d("FeedSnapshot", "PixelCopy failed: $result"); return@request }
                val context = activity.applicationContext
                thread {
                    runCatching {
                        val tmp = File(context.cacheDir, "$PREFIX.tmp")
                        tmp.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 72, it) }
                        val target = File(context.cacheDir, "$PREFIX.jpg")
                        target.delete()
                        tmp.renameTo(target)
                        savedThisRun = true
                        Log.d("FeedSnapshot", "saved ${target.length() / 1024} kB")
                    }
                }
            }, Handler(Looper.getMainLooper()))
        }.onFailure { Log.d("FeedSnapshot", "capture failed: $it") }
    }
}

/** The page's answer to [script] as a plain string (the JSON quotes removed). */
suspend fun WebViewNavigator.evalString(script: String): String = suspendCancellableCoroutine { c ->
    evaluateJavaScript(script) { if (c.isActive) c.resume(it.removeSurrounding("\"")) }
}

// 'ok' when the feed has drawn its posts (rows of the feed's list), 'login' on a login page, else 'wait'.
const val FEED_READY_JS = """(function(){
    if (document.querySelector('input[type=password]')) return 'login';
    var n = 0, r = document.querySelectorAll('[data-tracking-duration-id]');
    for (var i = 0; i < r.length; i++) { var p = r[i].parentElement; if (p && p.getAttribute('data-type') === 'vscroller') n++; }
    return location.pathname === '/' && n >= 3 ? 'ok' : 'wait';
})()"""

// The same, and the feed at the top with the pictures in view loaded: the moment to take the picture.
const val FEED_TOP_JS = """(function(){
    if (($FEED_READY_JS) !== 'ok' || window.scrollY > 50) return 'wait';
    var imgs = [].slice.call(document.images).filter(function(i){ var b = i.getBoundingClientRect(); return b.width > 80 && b.top < innerHeight && b.bottom > 0; });
    return imgs.every(function(i){ return i.complete && i.naturalWidth > 0; }) ? 'ok' : 'wait';
})()"""
