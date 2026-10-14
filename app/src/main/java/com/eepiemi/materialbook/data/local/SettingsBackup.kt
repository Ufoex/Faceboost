package com.eepiemi.materialbook.data.local

import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.Preferences
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.AMOLED_BLACK
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.APP_LOCK
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.AUTO_SCROLL_REELS
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.AUTO_UPDATE_CHECK
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.BRAVE_BLOCK_LIST
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.COLLAPSING_TOOLBAR
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.DESKTOP_LAYOUT
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.ENABLE_COPY_TO_CLIPBOARD
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.ENABLE_DOWNLOAD_CONTENT
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.HIDE_GROUPS
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.HIDE_NAV_BAR
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.HIDE_PEOPLE_YOU_MAY_KNOW
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.HIDE_REELS
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.HIDE_STORIES
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.HIDE_SUGGESTED
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.IMMERSIVE_MODE
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.KEEP_SCREEN_ON
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.MATERIAL_YOU
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.MESSAGES_DESKTOP
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.NOTIFY_POLL
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.OPEN_LINKS_IN_TAB
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.PINCH_TO_ZOOM
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.PIP_ENABLED
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.PIP_LOCKSCREEN_AUDIO
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.PIP_PORTRAIT_RATIO
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.REEL_BACKGROUND_AUDIO
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.REEL_CONTROLS
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.REEL_FIT
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.REEL_GESTURES
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.REEL_HOLD_RATE
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.REEL_SKIP_SECONDS
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.REMOVE_ADS
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.STICKY_NAVBAR
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.TEXT_ZOOM
import org.json.JSONObject

/**
 * Settings export and import (Settings -> Export / Import settings): a small JSON file,
 *
 *     {"format": "faceboost-settings", "version": 1, "settings": {"remove_ads": true, ...}}
 *
 * Only the keys listed here travel, each with its own type: an imported value of the wrong
 * type is skipped, never stored (reading it back could crash the app on every launch). Things
 * that belong to one phone (the chosen Messenger app, the notification prompt flag) stay out.
 */
private val BOOLEAN_KEYS = listOf(
    REMOVE_ADS, ENABLE_DOWNLOAD_CONTENT, ENABLE_COPY_TO_CLIPBOARD, DESKTOP_LAYOUT, HIDE_NAV_BAR,
    NOTIFY_POLL, IMMERSIVE_MODE, STICKY_NAVBAR, AUTO_SCROLL_REELS, REEL_BACKGROUND_AUDIO,
    AUTO_UPDATE_CHECK, REEL_CONTROLS, REEL_GESTURES, REEL_FIT, COLLAPSING_TOOLBAR, PINCH_TO_ZOOM,
    MATERIAL_YOU, AMOLED_BLACK, HIDE_SUGGESTED, HIDE_REELS, HIDE_STORIES, HIDE_PEOPLE_YOU_MAY_KNOW,
    HIDE_GROUPS, BRAVE_BLOCK_LIST, MESSAGES_DESKTOP, PIP_ENABLED, PIP_LOCKSCREEN_AUDIO,
    OPEN_LINKS_IN_TAB, APP_LOCK,
)
private val STRING_KEYS = listOf(PIP_PORTRAIT_RATIO, KEEP_SCREEN_ON)
private const val FORMAT = "faceboost-settings"
private const val VERSION = 1
private const val MAX_STRING_LENGTH = 32

/** The settings that are set (defaults aren't written), as an export file. */
fun exportSettingsJson(prefs: Preferences): String {
    val settings = JSONObject()
    BOOLEAN_KEYS.forEach { key -> prefs[key]?.let { settings.put(key.name, it) } }
    STRING_KEYS.forEach { key -> prefs[key]?.let { settings.put(key.name, it) } }
    prefs[REEL_HOLD_RATE]?.let { settings.put(REEL_HOLD_RATE.name, it.toDouble()) }
    prefs[REEL_SKIP_SECONDS]?.let { settings.put(REEL_SKIP_SECONDS.name, it) }
    prefs[TEXT_ZOOM]?.let { settings.put(TEXT_ZOOM.name, it) }
    return JSONObject().put("format", FORMAT).put("version", VERSION).put("settings", settings).toString(2)
}

/**
 * Applies an export file to [prefs]: every known setting it holds with the right type.
 * Returns how many were applied; throws IllegalArgumentException for a file that isn't one
 * of ours.
 */
fun importSettingsJson(json: String, prefs: MutablePreferences): Int {
    val root = runCatching { JSONObject(json) }.getOrNull()
    require(root != null && root.optString("format") == FORMAT) { "Not a Faceboost settings file" }
    require(root.optInt("version", -1) == VERSION) { "Unsupported settings file version" }
    val settings = root.optJSONObject("settings") ?: throw IllegalArgumentException("No settings in the file")
    var applied = 0
    BOOLEAN_KEYS.forEach { key -> (settings.opt(key.name) as? Boolean)?.let { prefs[key] = it; applied++ } }
    STRING_KEYS.forEach { key ->
        (settings.opt(key.name) as? String)?.takeIf { it.length <= MAX_STRING_LENGTH }
            ?.let { prefs[key] = it; applied++ }
    }
    (settings.opt(REEL_HOLD_RATE.name) as? Number)?.toFloat()?.takeIf { it in 1f..4f }
        ?.let { prefs[REEL_HOLD_RATE] = it; applied++ }
    (settings.opt(REEL_SKIP_SECONDS.name) as? Int)?.takeIf { it in 1..60 }
        ?.let { prefs[REEL_SKIP_SECONDS] = it; applied++ }
    (settings.opt(TEXT_ZOOM.name) as? Int)?.takeIf { it in 85..150 }?.let { prefs[TEXT_ZOOM] = it; applied++ }
    return applied
}
