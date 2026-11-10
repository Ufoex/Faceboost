package com.eepiemi.materialbook.utils

import android.webkit.WebViewClient

/**
 * A page error that means Facebook can't be reached (no connection, a name that doesn't resolve,
 * a refused connection, a timeout), for which the app shows its network error dialog in place of
 * the page. Any other main-frame error leaves the page alone: Facebook's redirect after start
 * sometimes fails as net::ERR_FAILED (ERROR_UNKNOWN), and the dialog then took the page away
 * with the WebView (seen on GitHub's emulator, 2026-10-27). WebView reports no connection at all
 * (ERR_INTERNET_DISCONNECTED) as ERROR_HOST_LOOKUP.
 */
fun isConnectionError(code: Int): Boolean = code in CONNECTION_ERRORS

private val CONNECTION_ERRORS = setOf(
    WebViewClient.ERROR_HOST_LOOKUP,
    WebViewClient.ERROR_CONNECT,
    WebViewClient.ERROR_IO,
    WebViewClient.ERROR_TIMEOUT,
)
