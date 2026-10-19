package com.eepiemi.materialbook.utils

import java.io.File

/**
 * Deletes cache files nobody touched for a while; run at app start. The app's own temporary files
 * (update APK, clipboard images, download leftovers) go after a day. The WebView's HTTP cache lives
 * under "WebView" and Chromium trims it by itself, so only files really stale (two weeks) go from it:
 * Facebook's scripts and styles are reused for weeks and would be downloaded again otherwise.
 */
object CacheCleaner {
    private const val DAY_MS = 24L * 60 * 60 * 1000

    fun clean(cacheDir: File, now: Long = System.currentTimeMillis()) {
        cacheDir.listFiles()?.forEach { purge(it, now - if (it.name == "WebView") 14 * DAY_MS else DAY_MS) }
    }

    private fun purge(file: File, before: Long) {
        if (file.isDirectory) file.listFiles()?.forEach { purge(it, before) }
        else if (file.lastModified() < before) file.delete()
    }
}
