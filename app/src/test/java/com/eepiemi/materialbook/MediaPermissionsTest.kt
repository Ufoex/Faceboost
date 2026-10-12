package com.eepiemi.materialbook

import android.webkit.PermissionRequest
import com.eepiemi.materialbook.utils.webMediaGrant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MediaPermissionsTest {
    private val cam = PermissionRequest.RESOURCE_VIDEO_CAPTURE
    private val mic = PermissionRequest.RESOURCE_AUDIO_CAPTURE

    @Test
    fun facebookAndMessengerGetCameraAndMicrophone() {
        assertEquals(listOf(mic, cam), webMediaGrant("https://www.facebook.com", arrayOf(mic, cam)))
        assertEquals(listOf(mic), webMediaGrant("https://messenger.com", arrayOf(mic)))
    }

    @Test
    fun everythingElseIsDenied() {
        assertNull(webMediaGrant("https://evil.com", arrayOf(mic)))
        assertNull(webMediaGrant("https://facebook.com.evil.com", arrayOf(mic)))
        assertNull(webMediaGrant("https://facebook.com@evil.com", arrayOf(mic)))
        assertNull(webMediaGrant("http://www.facebook.com", arrayOf(mic)))
        assertNull(webMediaGrant("https://www.facebook.com", arrayOf(PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID)))
        assertNull(webMediaGrant("https://www.facebook.com", arrayOf(mic, PermissionRequest.RESOURCE_MIDI_SYSEX)))
        assertNull(webMediaGrant("https://www.facebook.com", emptyArray()))
    }
}
