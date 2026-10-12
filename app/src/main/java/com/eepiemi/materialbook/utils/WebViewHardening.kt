package com.eepiemi.materialbook.utils

import android.webkit.WebView
import com.multiplatform.webview.web.WebViewState

/**
 * Settings every WebView in the app gets, called from its onCreated. File access and Safe
 * Browsing are compose-webview's defaults today; they are set here explicitly so a library
 * update can't change them unnoticed. Geolocation is switched off on the WebView itself:
 * Facebook doesn't need it and nothing in the app would grant the prompt.
 */
fun hardenWebView(state: WebViewState, webView: WebView) {
    state.webSettings.androidWebSettings.apply {
        allowFileAccess = false
        safeBrowsingEnabled = true
    }
    state.webSettings.allowFileAccessFromFileURLs = false
    state.webSettings.allowUniversalAccessFromFileURLs = false
    webView.settings.setGeolocationEnabled(false)
}
