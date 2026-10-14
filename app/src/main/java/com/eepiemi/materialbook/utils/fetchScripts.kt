package com.eepiemi.materialbook.utils

import androidx.annotation.RawRes

// Still used for the ad block list (BraveBlockList), not for page scripts.
const val SCRIPT_SRC = "https://raw.githubusercontent.com/Ufoex/Faceboost/refs/heads/main/app/src/main/res/raw/"

data class Script(
    val isEnabled: Boolean,
    @param:RawRes val resourceId:  Int,
    val scriptTitle: String
)

// Page scripts are never downloaded: only the copies bundled in the app run, so a script
// change reaches users only with an app update.
fun bundleScripts(scripts: List<Script>, readBundled: (Int) -> String): String = buildString {
    // FB is an SPA, same document lives across feed -> post -> back, and
    // MaterialbookWV re-evaluates this bundle on every Finished. Without
    // this guard each navigation stacks ~20 more MutationObservers on the
    // same document, so the app gets slower the more posts you tap.
    // window flags reset on a real reload, so refresh() still reinstalls cleanly.
    append("if(!window._mbBundleInjected){window._mbBundleInjected=true;")
    scripts.filter { it.isEnabled }.forEach {
        append('\n')
        append(readBundled(it.resourceId))
    }
    append('\n')
    append("}")
}
