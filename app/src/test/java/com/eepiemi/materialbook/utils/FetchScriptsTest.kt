package com.eepiemi.materialbook.utils

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FetchScriptsTest {

    private val scriptA = Script(isEnabled = true, resourceId = 1, scriptTitle = "a.js")
    private val scriptB = Script(isEnabled = true, resourceId = 2, scriptTitle = "b.js")

    private fun bundled(resourceId: Int) = "bundled-$resourceId"

    // The bundle is wrapped in an inject-once guard; strip it and the per-script
    // newlines so the tests can compare the raw script content.
    private fun unwrap(bundle: String) = bundle
        .removePrefix("if(!window._mbBundleInjected){window._mbBundleInjected=true;")
        .removeSuffix("}")
        .replace("\n", "")

    @Test
    fun usesTheBundledCopies_inCallerOrder() {
        assertEquals("bundled-1bundled-2", unwrap(bundleScripts(listOf(scriptA, scriptB), ::bundled)))
    }

    @Test
    fun skipsDisabledScripts() {
        val result = bundleScripts(listOf(scriptA, scriptB.copy(isEnabled = false)), ::bundled)

        assertTrue(result.contains("bundled-1"))
        assertFalse(result.contains("bundled-2"))
    }
}
