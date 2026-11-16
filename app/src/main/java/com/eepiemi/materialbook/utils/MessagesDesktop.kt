package com.eepiemi.materialbook.utils

import java.net.URI

const val MESSAGES_DESKTOP_URL = "https://www.facebook.com/messages/"

private fun hostAndPath(url: String): Pair<String, String>? {
    val uri = runCatching { URI(url) }.getOrNull() ?: return null
    val scheme = uri.scheme?.lowercase()
    if (scheme != "http" && scheme != "https") return null
    return (uri.host ?: return null).lowercase() to (uri.path ?: "")
}

private fun isFacebookHost(host: String) =
    (host == "facebook.com" || host.endsWith(".facebook.com")) &&
        !host.startsWith("l.") && !host.startsWith("lm.")

/**
 * Every way Facebook's mobile site (m.facebook.com) tries to open Messages/Messenger: the facebook.com/messages
 * page, m.me and messenger.com links, and the fb-messenger:// and intent:// deep links
 * that start the Messenger app (none of which render usefully in the mobile web view).
 */
fun isMessagesLink(url: String): Boolean {
    val scheme = url.substringBefore(':', "").lowercase()
    if (scheme == "fb-messenger" || scheme == "fb-messenger-share") return true
    if (scheme == "intent") return Regex("package=[^;]*(orca|messenger|mlite)").containsMatchIn(url)
    val (host, path) = hostAndPath(url) ?: return false
    if (host == "m.me" || host.endsWith(".m.me")) return true
    if (host == "messenger.com" || host.endsWith(".messenger.com")) return true
    return isFacebookHost(host) && path.startsWith("/messages")
}

/** Where a main-frame navigation inside the Messages layer goes. */
sealed interface MessagesLayerRoute {
    /** Stays in the layer as is (the desktop Messages page, login/checkpoint, subframes). */
    data object Allow : MessagesLayerRoute

    /** Another form of a Messages link: open its desktop equivalent in the layer instead. */
    data class Remap(val url: String) : MessagesLayerRoute

    /** A regular Facebook page: close the layer and open it in the main (mobile) view. */
    data class OpenInMain(val url: String) : MessagesLayerRoute

    /** Not Facebook: hand it to the system, as the main view does. */
    data class External(val url: String) : MessagesLayerRoute
}

fun messagesLayerRoute(url: String, isMainFrame: Boolean): MessagesLayerRoute {
    if (!isMainFrame || isDesktopMessagesUrl(url)) return MessagesLayerRoute.Allow
    if (isMessagesLink(url)) return MessagesLayerRoute.Remap(messagesDesktopUrl(url))
    val (host, path) = hostAndPath(url) ?: return MessagesLayerRoute.External(url)
    if (!isFacebookHost(host)) return MessagesLayerRoute.External(url)
    // The desktop Messages page may bounce through these before showing the inbox.
    if (path.startsWith("/login") || path.startsWith("/checkpoint")) return MessagesLayerRoute.Allow
    return MessagesLayerRoute.OpenInMain(url)
}

/** The desktop Messages page (the one loaded with the desktop user agent). */
fun isDesktopMessagesUrl(url: String): Boolean {
    val uri = runCatching { java.net.URI(url) }.getOrNull() ?: return false
    return uri.host?.lowercase() == "www.facebook.com" && (uri.path ?: "").startsWith("/messages")
}

/**
 * The mobile site's address for a desktop-site page the main view landed on in mobile mode, or
 * null when [url] isn't one (or is a desktop Messages page, which has none).
 *
 * m.facebook.com answers a desktop browser with a permanent redirect to www.facebook.com, and the
 * WebView caches it: after Desktop layout (or a Messages layer page) had loaded an m.facebook.com
 * address, the mobile main view followed the cached redirect to the desktop site, Home included.
 * `_rdr`, the redirect's own mark, is dropped. (Found in AstryxBook, written again here.)
 */
fun mobileSiteUrl(url: String?): String? {
    val uri = url?.let { runCatching { java.net.URI(it) }.getOrNull() } ?: return null
    if (uri.scheme != "https" || uri.host?.lowercase() != "www.facebook.com") return null
    if (isDesktopMessagesUrl(url)) return null
    val query = uri.rawQuery?.split('&')?.filter { it.isNotEmpty() && it != "_rdr" && !it.startsWith("_rdr=") }
        ?.joinToString("&")?.ifEmpty { null }
    return "https://m.facebook.com" + (uri.rawPath ?: "/").ifEmpty { "/" } + (query?.let { "?$it" } ?: "") +
        (uri.rawFragment?.let { "#$it" } ?: "")
}

private val THREAD_PATH = Regex("^/messages/(?:e2ee/)?t/[^/]+")

/**
 * Desktop equivalent of any Messages/Messenger link, so deep links keep their conversation:
 * `facebook.com/messages/t/<id>`, `m.me/<name>`, `messenger.com/t/<id>` and
 * `fb-messenger://user/<id>` open that thread; anything else opens the inbox.
 */
fun messagesDesktopUrl(url: String): String {
    val inbox = MESSAGES_DESKTOP_URL
    val uri = runCatching { java.net.URI(url) }.getOrNull() ?: return inbox
    val scheme = uri.scheme?.lowercase()
    val host = uri.host?.lowercase() ?: ""
    val path = uri.path ?: ""
    fun thread(id: String) = if (id.isBlank()) inbox else "https://www.facebook.com/messages/t/$id"
    return when {
        scheme == "fb-messenger" && (host == "user" || host == "threads") ->
            thread(path.trim('/').substringBefore('/'))
        scheme != "http" && scheme != "https" -> inbox
        host == "m.me" || host.endsWith(".m.me") -> {
            val first = path.trim('/').substringBefore('/')
            // m.me/j/<code> is a group invite: no desktop equivalent
            if (first == "j") inbox else thread(first)
        }
        host == "messenger.com" || host.endsWith(".messenger.com") ->
            if (path.startsWith("/t/")) thread(path.removePrefix("/t/").substringBefore('/')) else inbox
        else -> THREAD_PATH.find(path)?.let { "https://www.facebook.com" + it.value } ?: inbox
    }
}

/**
 * Facebook's home page (the logo in the Messages layer's header points there). Going "home" from
 * the layer just closes it: the feed underneath is still there, loading it again would restart it.
 */
fun isFacebookHomeUrl(url: String): Boolean {
    val (host, path) = hostAndPath(url) ?: return false
    return isFacebookHost(host) && (path == "" || path == "/" || path == "/home.php")
}
