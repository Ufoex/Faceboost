package com.eepiemi.materialbook.utils

import android.content.pm.ActivityInfo
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalConfiguration

// Device-class check only: smallestScreenWidthDp doesn't change with rotation,
// so a phone launched sideways is no longer treated as a large screen (that
// used to get it stuck in the desktop layout).
fun isAutoDesktopScreen(smallestScreenWidthDp: Int): Boolean = smallestScreenWidthDp >= 600

/**
 * Requested orientation for the activity. Phones stay portrait while
 * browsing and may rotate only while a video is in HTML5 fullscreen, by the
 * sensor even if the system auto-rotate is off (with it off, FULL_USER only
 * offered Android's temporary rotate button, and the screen went back to portrait): Facebook's mobile site handles a real
 * landscape page badly (it skips the reel on rotation, and leaving fullscreen
 * in landscape leaves its viewer showing an oversized still frame instead of
 * the video, same in Chrome). Tablets follow the same rule: laid flat, the phone site is
 * cropped (it caps its page at 800 px wide and sizes the viewer for portrait).
 */
fun appOrientation(
    isFullscreen: Boolean,
    isMessagesLayerOpen: Boolean = false,
): Int = when {
    isFullscreen -> ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
    // The Messages layer shows the desktop site, which has room for the chat list beside the
    // conversation: it follows the system auto-rotate setting while it is open.
    isMessagesLayerOpen -> ActivityInfo.SCREEN_ORIENTATION_FULL_USER
    else -> ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT
}

// The user's choice wins; with none (null) a large screen is desktop.
// Computed at runtime; the automatic part is never persisted.
fun effectiveDesktop(userDesktopSetting: Boolean?, isAutoDesktop: Boolean): Boolean =
    userDesktopSetting ?: isAutoDesktop

@Composable
fun rememberAutoDesktop(): Boolean {
    val configuration = LocalConfiguration.current
    return remember { isAutoDesktopScreen(configuration.smallestScreenWidthDp) }
}
