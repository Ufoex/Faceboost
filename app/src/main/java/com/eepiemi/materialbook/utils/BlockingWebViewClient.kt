package com.eepiemi.materialbook.utils

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import com.multiplatform.webview.web.AccompanistWebViewClient
import java.io.ByteArrayInputStream

// Facebook's own Google Ads remarketing tag: every full m.facebook.com page load adds hidden
// www.fbsbx.com/paid_ads_pixel/ frames that load Google's gtag.js and report the visit to
// doubleclick.net and google.com. Nothing on Facebook's pages depends on it.
private val ADS_PIXEL_URL =
    Regex("""^https?://(?:[a-z0-9-]+\.)*fbsbx\.com(?::\d+)?/paid_ads_pixel(?:[/?#]|$)""", RegexOption.IGNORE_CASE)

fun isAdsPixelUrl(url: String): Boolean = ADS_PIXEL_URL.containsMatchIn(url)

/**
 * Enforces [BraveBlockList] at the actual network-request layer.
 *
 * [ExternalRequestInterceptor] only sees navigation attempts (it's wired to
 * shouldOverrideUrlLoading), so it never gets a chance to evaluate the
 * image/script/XHR/fetch calls that ad and tracker networks actually use.
 * shouldInterceptRequest fires for every resource the page loads, which is
 * where that traffic actually travels — this is the real enforcement point.
 *
 * Both overloads are overridden: API 24+ calls the [WebResourceRequest] variant,
 * API 23 calls the [String] variant. The main-frame document never passes
 * through shouldInterceptRequest, so isMainFrame is always passed as false.
 */
class BlockingWebViewClient : AccompanistWebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        val url = request?.url?.toString()
        if (url != null && (isAdsPixelUrl(url) || BraveBlockList.shouldBlock(url, request.isForMainFrame))) {
            // Returning null here means "don't intercept, load normally" — an
            // actual (empty) response is required to block.
            return WebResourceResponse("text/plain", "utf-8", ByteArrayInputStream(ByteArray(0)))
        }
        return super.shouldInterceptRequest(view, request)
    }

    @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
    override fun shouldInterceptRequest(view: WebView?, url: String?): WebResourceResponse? {
        if (url != null && (isAdsPixelUrl(url) || BraveBlockList.shouldBlock(url, isMainFrame = false))) {
            return WebResourceResponse("text/plain", "utf-8", ByteArrayInputStream(ByteArray(0)))
        }
        return super.shouldInterceptRequest(view, url)
    }
}
