package com.eepiemi.materialbook

import com.eepiemi.materialbook.utils.CacheCleaner
import java.io.File
import kotlin.io.path.createTempDirectory
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CacheCleanerTest {
    private val day = 24L * 60 * 60 * 1000

    private fun file(dir: File, path: String, ageMs: Long, now: Long) =
        File(dir, path).apply { parentFile?.mkdirs(); writeText("x"); setLastModified(now - ageMs) }

    @Test
    fun oldAppFilesGo_recentOnesAndFreshWebViewCacheStay() {
        val dir = createTempDirectory().toFile()
        val now = System.currentTimeMillis()
        val oldApk = file(dir, "updates/update.apk", 3 * day, now)
        val newImg = file(dir, "clipboard_images/a.png", day / 2, now)
        val webMid = file(dir, "WebView/Default/Cache/a_0", 5 * day, now)
        val webStale = file(dir, "WebView/Default/Cache/b_0", 20 * day, now)

        CacheCleaner.clean(dir, now)

        assertFalse(oldApk.exists())
        assertTrue(newImg.exists())
        assertTrue(webMid.exists())
        assertFalse(webStale.exists())
        dir.deleteRecursively()
    }
}
