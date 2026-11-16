package com.eepiemi.materialbook

import com.eepiemi.materialbook.utils.mobileSiteUrl
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MobileSiteTest {
    @Test
    fun desktopSitePageGoesBackToTheMobileSite() {
        assertEquals("https://m.facebook.com/", mobileSiteUrl("https://www.facebook.com/"))
        assertEquals("https://m.facebook.com/reel/1?a=2", mobileSiteUrl("https://www.facebook.com/reel/1?a=2&_rdr"))
        assertEquals("https://m.facebook.com/groups/x#top", mobileSiteUrl("https://www.facebook.com/groups/x?_rdr=p#top"))
    }

    @Test
    fun otherPagesAreLeftAlone() {
        assertNull(mobileSiteUrl("https://m.facebook.com/"))
        assertNull(mobileSiteUrl("https://www.facebook.com/messages/t/123")) // the desktop Messages page has no mobile one
        assertNull(mobileSiteUrl("http://www.facebook.com/"))
        assertNull(mobileSiteUrl("https://example.com/"))
        assertNull(mobileSiteUrl(null))
    }
}
