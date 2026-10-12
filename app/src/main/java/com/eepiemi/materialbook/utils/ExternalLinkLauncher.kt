package com.eepiemi.materialbook.utils

import android.content.Context
import android.content.Intent
import androidx.core.net.toUri
import java.net.URI

/** Schemes the WebView renders itself; never hand these to another app. */
private val WEBVIEW_SCHEMES = setOf("about", "data", "blob", "file", "javascript")

private val WEB_SCHEMES = setOf("http", "https")

/** Facebook's own short-link domains; they redirect to facebook.com. */
private val SHORT_HOSTS = setOf("fb.com", "www.fb.com", "fb.me", "www.fb.me")

private const val MOBILE = "https://m.facebook.com/"

// fb://<kind>/<id> -> mobile web path. Kinds the Facebook app registers; the rest open the feed.
private val DEEP_LINK_PATHS = mapOf<String, (String) -> String>(
    "profile" to { "profile.php?id=$it" },
    "user" to { "profile.php?id=$it" },
    "page" to { it },
    "group" to { "groups/$it" },
    "event" to { "events/$it" },
    "post" to { it },
    "story" to { it },
    "photo" to { "photo.php?fbid=$it" },
    "video" to { "watch/?v=$it" },
    "reel" to { "reel/$it" },
    "marketplace" to { "marketplace/" },
    "notifications" to { "notifications/" },
    "friends" to { "friends/" },
    "watch" to { "watch/" },
)

/**
 * Where a VIEW intent's data should load. fb:// and facebook:// app deep links become
 * m.facebook.com pages (the WebView can't open them); web links are kept as they are.
 */
fun intentUrl(data: String): String {
    val uri = runCatching { URI(data) }.getOrNull() ?: return data
    if (uri.scheme?.lowercase() !in setOf("fb", "facebook")) return data
    val kind = uri.host?.lowercase().orEmpty()
    val id = uri.path?.trim('/')?.substringBefore('/').orEmpty()
    val path = DEEP_LINK_PATHS[kind]
    return if (path == null || (id.isEmpty() && kind in ID_KINDS)) MOBILE else MOBILE + path(id)
}

private val ID_KINDS = setOf("profile", "user", "page", "group", "event", "post", "story", "photo", "video", "reel")

private fun schemeOf(url: String): String? =
    runCatching { URI(url).scheme?.lowercase() }.getOrNull()

/**
 * True when the WebView should keep the URL to itself. False means "leave the app":
 * either an app deep link (fb-messenger:, market:, intent:, tel:) or a site that isn't
 * Facebook.
 */
fun isWebViewRenderable(url: String): Boolean {
    val scheme = schemeOf(url) ?: return false
    if (scheme in WEBVIEW_SCHEMES) return true
    if (scheme !in WEB_SCHEMES) return false
    // Facebook proper, any subdomain, plus fb.watch short links. The l./lm.facebook.com
    // redirectors are excluded on purpose: /l.php only ever points somewhere else, and
    // they are *subdomains* of facebook.com, so a plain suffix test would keep them here.
    val host = runCatching { URI(url).host?.lowercase() }.getOrNull() ?: return false
    if (host == "l.facebook.com" || host == "lm.facebook.com") return false
    return host == "facebook.com" || host.endsWith(".facebook.com") || host == "fb.watch" ||
        host in SHORT_HOSTS
}

/** What to do with a link a page sends out of the app. */
enum class ExternalLinkAction { OPEN, CONFIRM, BLOCK }

/**
 * Web, email and phone links open directly; code and local-file schemes are refused; any other
 * scheme (another app's deep link) asks the user first.
 */
fun externalLinkAction(url: String): ExternalLinkAction = when (schemeOf(url)) {
    "http", "https", "mailto", "tel" -> ExternalLinkAction.OPEN
    null, "javascript", "file", "content", "data", "about", "blob", "intent" -> ExternalLinkAction.BLOCK
    else -> ExternalLinkAction.CONFIRM
}

/**
 * Where an `intent://` link goes: never into the app it names (Facebook uses them to push its
 * own apps, and a page could aim one at any exported activity), only to its web fallback when it
 * carries one. Other links are returned as they are; null means there is nowhere to go.
 */
fun externalTarget(url: String): String? {
    if (!url.startsWith("intent:", ignoreCase = true)) return url
    val fallback = runCatching { Intent.parseUri(url, Intent.URI_INTENT_SCHEME).getStringExtra("browser_fallback_url") }.getOrNull()
    return fallback?.takeIf { schemeOf(it) in WEB_SCHEMES }
}

/**
 * The page a link sent to the app (VIEW intent, shortcut) should load, or null when it isn't a
 * Facebook web page: another app can send any data to an exported activity, and a javascript:,
 * file: or content: URL must never reach the WebView.
 */
fun appLinkUrl(data: String?): String? {
    val url = data?.let(::intentUrl) ?: return null
    return url.takeIf { schemeOf(it) in WEB_SCHEMES && isWebViewRenderable(it) }
}

/**
 * Hands a URL to whatever the user set as default browser/app (Brave, Chrome, ...), the way a
 * browser would: only to activities that accept links from a browser. Returns false when
 * nothing on the device can open it.
 */
fun openExternalUrl(context: Context, url: String): Boolean {
    val target = externalTarget(url) ?: return false
    val uri = runCatching { target.toUri() }.getOrNull() ?: return false
    val intent = Intent(Intent.ACTION_VIEW, uri)
        .addCategory(Intent.CATEGORY_BROWSABLE)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        .apply { selector = null }
    return runCatching { context.startActivity(intent) }.isSuccess
}
