package com.eepiemi.materialbook

import com.eepiemi.materialbook.utils.ExternalLinkAction.BLOCK
import com.eepiemi.materialbook.utils.ExternalLinkAction.CONFIRM
import com.eepiemi.materialbook.utils.ExternalLinkAction.OPEN
import com.eepiemi.materialbook.utils.appLinkUrl
import com.eepiemi.materialbook.utils.externalLinkAction
import com.eepiemi.materialbook.utils.externalTarget
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

// Robolectric: externalTarget parses intent: URIs with Android's Intent.
@RunWith(RobolectricTestRunner::class)
class ExternalLinkActionTest {

    @Test
    fun webEmailAndPhoneOpenDirectly() {
        listOf("https://example.com/a", "http://example.com", "mailto:a@b.c", "tel:+5255").forEach {
            assertEquals(it, OPEN, externalLinkAction(it))
        }
    }

    @Test
    fun codeAndLocalSchemesAreBlocked() {
        listOf("javascript:alert(1)", "file:///sdcard/x", "content://x/y", "data:text/html,hi", "not a url").forEach {
            assertEquals(it, BLOCK, externalLinkAction(it))
        }
    }

    @Test
    fun otherAppsAskFirst() {
        listOf("market://details?id=x", "fb-messenger://user/1", "whatsapp://send?text=a").forEach {
            assertEquals(it, CONFIRM, externalLinkAction(it))
        }
    }

    @Test
    fun intentLinksOnlyGoToTheirWebFallback() {
        assertEquals(
            "https://example.com/x",
            externalTarget("intent://x#Intent;scheme=app;S.browser_fallback_url=https%3A%2F%2Fexample.com%2Fx;end")
        )
        assertNull(externalTarget("intent://x#Intent;scheme=app;package=com.evil;end"))
        assertNull(externalTarget("intent://x#Intent;scheme=app;S.browser_fallback_url=javascript%3Aalert(1);end"))
        assertEquals("https://example.com/", externalTarget("https://example.com/"))
    }

    @Test
    fun appLinksMustBeFacebookWebPages() {
        assertEquals("https://m.facebook.com/groups/9", appLinkUrl("https://m.facebook.com/groups/9"))
        assertEquals("https://m.facebook.com/reel/5", appLinkUrl("fb://reel/5"))
        assertNull(appLinkUrl("javascript:alert(1)"))
        assertNull(appLinkUrl("file:///data/data/x"))
        assertNull(appLinkUrl("https://evil.com/facebook.com"))
        assertNull(appLinkUrl("https://facebook.com@evil.com/"))
        assertNull(appLinkUrl("https://l.facebook.com/l.php?u=x"))
        assertNull(appLinkUrl(null))
    }
}
