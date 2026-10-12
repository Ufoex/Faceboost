package com.eepiemi.materialbook.utils

import android.content.Context
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.net.toUri

private val WEB_URL = Regex("""^https?://[^\s/?#]+""", RegexOption.IGNORE_CASE)

/** An http(s) link with a host: the only kind a Custom Tab opens. */
fun isWebUrl(url: String): Boolean = WEB_URL.containsMatchIn(url.trim())

/**
 * Opens [url] in a Custom Tab: the default browser's tab drawn over the app, with the browser's
 * own cookies instead of the app's Facebook login. Returns false when no browser can show it,
 * so the caller opens the link the usual way.
 */
fun openInCustomTab(context: Context, url: String): Boolean = runCatching {
    CustomTabsIntent.Builder()
        .setShowTitle(true)
        .setShareState(CustomTabsIntent.SHARE_STATE_ON)
        .build()
        .launchUrl(context, url.toUri())
}.isSuccess
