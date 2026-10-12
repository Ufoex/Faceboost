package com.eepiemi.materialbook

import androidx.datastore.preferences.core.mutablePreferencesOf
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.HIDE_REELS
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.KEEP_SCREEN_ON
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.REEL_HOLD_RATE
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.REEL_SKIP_SECONDS
import com.eepiemi.materialbook.data.local.SettingsDataStore.Companion.REMOVE_ADS
import com.eepiemi.materialbook.data.local.exportSettingsJson
import com.eepiemi.materialbook.data.local.importSettingsJson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

// Robolectric for org.json (the plain JVM stub has no implementation).
@RunWith(RobolectricTestRunner::class)
class SettingsBackupTest {

    @Test
    fun exportThenImport_restoresTheSettings() {
        val source = mutablePreferencesOf(
            REMOVE_ADS to false, HIDE_REELS to true, KEEP_SCREEN_ON to "video",
            REEL_HOLD_RATE to 3f, REEL_SKIP_SECONDS to 15,
        )
        val target = mutablePreferencesOf()
        assertEquals(5, importSettingsJson(exportSettingsJson(source), target))
        assertEquals(false, target[REMOVE_ADS])
        assertEquals(true, target[HIDE_REELS])
        assertEquals("video", target[KEEP_SCREEN_ON])
        assertEquals(3f, target[REEL_HOLD_RATE])
        assertEquals(15, target[REEL_SKIP_SECONDS])
    }

    @Test
    fun wrongTypesAndOutOfRangeValuesAreSkipped() {
        val target = mutablePreferencesOf()
        val json = """{"format":"faceboost-settings","version":1,"settings":
            {"remove_ads":"yes","keep_screen_on":5,"reel_hold_rate":99,"reel_skip_seconds":0}}"""
        assertEquals(0, importSettingsJson(json, target))
        assertNull(target[REMOVE_ADS])
        assertNull(target[REEL_HOLD_RATE])
    }

    @Test
    fun otherFilesAreRejected() {
        assertThrows(IllegalArgumentException::class.java) { importSettingsJson("not json", mutablePreferencesOf()) }
        assertThrows(IllegalArgumentException::class.java) { importSettingsJson("""{"format":"x"}""", mutablePreferencesOf()) }
    }
}
