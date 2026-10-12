package com.eepiemi.materialbook.utils

import java.net.URLDecoder

// Click and share trackers: Facebook's own (fbclid, __cft__[0], __tn__, mibextid, ...) and the
// usual ad and campaign ones. Matched on the decoded, lowercased parameter name. Functional
// parameters (ref, set, source, id, ...) are never touched: stripping them breaks pages.
private val TRACKING_PARAMS = setOf(
    "fbclid", "__tn__", "mibextid", "rdid", "igshid", "gclid", "dclid", "msclkid", "mc_eid",
)
private val TRACKING_PARAM_PREFIXES = listOf("utm_", "__cft__", "__xts__")

private val FACEBOOK_REDIRECT = Regex("""^https?://(?:l|lm)\.facebook\.com/l\.php\?""", RegexOption.IGNORE_CASE)

/**
 * A link as it leaves the app (to the browser, another app, the share sheet): unwrapped from
 * Facebook's l.facebook.com / lm.facebook.com redirect and without tracking parameters. The rest
 * of the link is kept byte for byte (its encoding, the other parameters and their order, the
 * #fragment).
 */
fun fbRedirectSanitizer(link: String): String = stripTrackingParams(unwrapFacebookRedirect(link) ?: link)

/** The target of an l.facebook.com/l.php?u=... redirect, if it's a web link. */
fun unwrapFacebookRedirect(link: String): String? {
    if (!FACEBOOK_REDIRECT.containsMatchIn(link)) return null
    val query = link.substringAfter('?').substringBefore('#')
    val raw = query.split('&').firstOrNull { it.startsWith("u=") }?.substringAfter('=') ?: return null
    val target = runCatching { URLDecoder.decode(raw, "UTF-8") }.getOrNull() ?: return null
    return target.takeIf { it.startsWith("https://", ignoreCase = true) || it.startsWith("http://", ignoreCase = true) }
}

fun stripTrackingParams(link: String): String {
    val fragmentStart = link.indexOf('#').takeIf { it >= 0 } ?: link.length
    val queryStart = link.indexOf('?').takeIf { it in 0 until fragmentStart } ?: return link
    val kept = link.substring(queryStart + 1, fragmentStart)
        .split('&')
        .filter { it.isNotEmpty() && !isTrackingParam(it.substringBefore('=')) }
    return link.substring(0, queryStart) +
        (if (kept.isEmpty()) "" else "?" + kept.joinToString("&")) +
        link.substring(fragmentStart)
}

private fun isTrackingParam(rawName: String): Boolean {
    val name = runCatching { URLDecoder.decode(rawName, "UTF-8") }.getOrDefault(rawName).lowercase()
    return name in TRACKING_PARAMS || TRACKING_PARAM_PREFIXES.any { name.startsWith(it) }
}
