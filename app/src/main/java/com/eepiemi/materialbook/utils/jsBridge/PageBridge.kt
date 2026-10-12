package com.eepiemi.materialbook.utils.jsBridge

import android.webkit.WebView
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.eepiemi.materialbook.utils.BackgroundAudioWebView
import org.json.JSONObject

// The page object the app's scripts post their one-way calls to (settings button, theme colour,
// video state, Messages navigation, clipboard, reel audio). The scripts fall back to the named
// bridges (SettingsBridge, ThemeBridge, PipBridge, MessagesBridge, ClipboardBridge,
// BgAudioBridge) when it is missing.
const val PAGE_LISTENER_NAME = "FaceboostPage"

private val PAGE_ORIGINS = setOf(
    "https://facebook.com", "https://*.facebook.com",
    "https://messenger.com", "https://*.messenger.com"
)

/** The page -> app calls a WebView takes; null ones aren't offered to its page at all. */
class PageBridges(
    val settings: MaterialbookSettings? = null,
    val theme: ThemeChange? = null,
    val pip: PipBridge? = null,
    val layer: MessagesBridge? = null,
    val clipboard: ClipboardBridge? = null,
    val bgAudio: BackgroundAudioWebView.Bridge? = null,
)

/**
 * Exposes [bridges] to the page the same way as downloads: with WebView's message listener only
 * the main frame of a Facebook or Messenger page can reach them, not iframes or other origins
 * (an ad could otherwise open Settings, recolour the bars, fake a playing video or write the
 * clipboard). Older WebViews fall back to the JS interfaces. Messages arrive on the UI thread.
 */
fun installPageBridges(webView: WebView, bridges: PageBridges) {
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
        bridges.settings?.let { webView.addJavascriptInterface(it, "SettingsBridge") }
        bridges.theme?.let { webView.addJavascriptInterface(it, "ThemeBridge") }
        bridges.pip?.let { webView.addJavascriptInterface(it, "PipBridge") }
        bridges.layer?.let { webView.addJavascriptInterface(it, "MessagesBridge") }
        bridges.clipboard?.let { webView.addJavascriptInterface(it, "ClipboardBridge") }
        bridges.bgAudio?.let { webView.addJavascriptInterface(it, "BgAudioBridge") }
        return
    }
    WebViewCompat.addWebMessageListener(webView, PAGE_LISTENER_NAME, PAGE_ORIGINS) { _, message, sourceOrigin, isMainFrame, _ ->
        if (!isMainFrame) return@addWebMessageListener
        val host = sourceOrigin.host?.lowercase() ?: return@addWebMessageListener
        if (listOf("facebook.com", "messenger.com").none { host == it || host.endsWith(".$it") }) return@addWebMessageListener
        message.data?.let { dispatchPageMessage(it, bridges) }
    }
}

/**
 * Runs one page message, `{"call": name, ...}`, on [bridges]. Unknown calls, calls to a bridge
 * this page doesn't have and malformed messages are ignored. Returns whether one ran.
 */
fun dispatchPageMessage(data: String, bridges: PageBridges): Boolean {
    val msg = runCatching { JSONObject(data) }.getOrNull() ?: return false
    when (msg.optString("call")) {
        "openSettings" -> bridges.settings?.onSettingsToggle() ?: return false
        "themeColor" -> bridges.theme?.onThemeColorChanged(msg.optString("color").takeIf { it.isNotEmpty() })
            ?: return false
        "videoState" -> bridges.pip?.setVideoState(msg.optBoolean("playing"), msg.optInt("width"), msg.optInt("height"))
            ?: return false
        "pipAnomaly" -> bridges.pip?.logPipAnomaly(msg.optString("message")) ?: return false
        "pageVisible" -> bridges.pip?.onPageVisible() ?: return false
        "leftMessages" -> bridges.layer?.onLeftMessages(msg.optString("url").takeIf { it.isNotEmpty() } ?: return false)
            ?: return false
        "copyText" -> bridges.clipboard?.copyText(msg.optString("text")) ?: return false
        "copyImage" -> {
            val clipboard = bridges.clipboard ?: return false
            val image = msg.optString("data")
            val type = msg.optString("mimeType")
            // Decoding and writing an image doesn't belong on the UI thread.
            Thread { clipboard.copyImageToClipboard(image, type) }.start()
        }
        "bgAudio" -> bridges.bgAudio?.set(msg.optBoolean("on")) ?: return false
        else -> return false
    }
    return true
}
