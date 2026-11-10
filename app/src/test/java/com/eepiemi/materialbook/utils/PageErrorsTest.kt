package com.eepiemi.materialbook.utils

import android.webkit.WebViewClient
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PageErrorsTest {

    @Test
    fun noConnection_isANetworkError() {
        assertTrue(isConnectionError(WebViewClient.ERROR_HOST_LOOKUP)) // also ERR_INTERNET_DISCONNECTED
        assertTrue(isConnectionError(WebViewClient.ERROR_CONNECT))
        assertTrue(isConnectionError(WebViewClient.ERROR_IO))
        assertTrue(isConnectionError(WebViewClient.ERROR_TIMEOUT))
    }

    @Test
    fun aFailedOrCancelledLoad_isNot() {
        // net::ERR_FAILED on Facebook's redirect after start (GitHub's emulator, 2026-10-27).
        assertFalse(isConnectionError(WebViewClient.ERROR_UNKNOWN))
        assertFalse(isConnectionError(WebViewClient.ERROR_UNSUPPORTED_SCHEME))
        assertFalse(isConnectionError(WebViewClient.ERROR_BAD_URL))
    }
}
