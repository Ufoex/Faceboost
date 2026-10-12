package com.eepiemi.materialbook

import com.eepiemi.materialbook.utils.jsBridge.MaterialbookSettings
import com.eepiemi.materialbook.utils.jsBridge.PageBridges
import com.eepiemi.materialbook.utils.jsBridge.PipBridge
import com.eepiemi.materialbook.utils.jsBridge.dispatchPageMessage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

// Robolectric for org.json (the plain JVM stub has no implementation).
@RunWith(RobolectricTestRunner::class)
class PageBridgeTest {

    @Test
    fun callsReachTheirBridge() {
        var settings = 0
        var video: Triple<Boolean, Int, Int>? = null
        val bridges = PageBridges(
            settings = MaterialbookSettings { settings++ },
            pip = PipBridge({ playing, w, h -> video = Triple(playing, w, h) }),
        )
        assertTrue(dispatchPageMessage("""{"call":"openSettings"}""", bridges))
        assertEquals(1, settings)
        assertTrue(dispatchPageMessage("""{"call":"videoState","playing":true,"width":720,"height":1280}""", bridges))
        assertEquals(Triple(true, 720, 1280), video)
    }

    @Test
    fun unknownMalformedAndMissingBridgeCallsAreIgnored() {
        val bridges = PageBridges(settings = MaterialbookSettings { error("must not run") })
        assertFalse(dispatchPageMessage("""{"call":"rm -rf"}""", bridges))
        assertFalse(dispatchPageMessage("not json", bridges))
        // this page has no clipboard bridge
        assertFalse(dispatchPageMessage("""{"call":"copyText","text":"x"}""", bridges))
        assertFalse(dispatchPageMessage("""{"call":"leftMessages","url":"https://x"}""", bridges))
    }

    @Test
    fun shareLinkOnlyTakesFacebookPages() {
        val shared = mutableListOf<String>()
        val bridges = PageBridges(share = { shared += it })
        assertTrue(dispatchPageMessage("""{"call":"shareLink","url":"https://www.facebook.com/share/r/abc/"}""", bridges))
        assertFalse(dispatchPageMessage("""{"call":"shareLink","url":"https://evil.com/x"}""", bridges))
        assertFalse(dispatchPageMessage("""{"call":"shareLink","url":"javascript:alert(1)"}""", bridges))
        assertEquals(listOf("https://www.facebook.com/share/r/abc/"), shared)
    }
}
