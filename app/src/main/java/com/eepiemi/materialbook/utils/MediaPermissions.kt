package com.eepiemi.materialbook.utils

import android.Manifest
import android.webkit.PermissionRequest

private val CALL_HOSTS = listOf("facebook.com", "messenger.com")

/**
 * Messenger calls (desktop Messages, in the Messages layer) ask the page for the camera and
 * microphone. Only Facebook's and Messenger's own https pages get them, and only those two
 * resources; anything else a page asks for (protected media IDs, MIDI) is denied. Returns the
 * resources to grant, or null to deny the request.
 */
fun webMediaGrant(origin: String, resources: Array<String>): List<String>? {
    val uri = runCatching { java.net.URI(origin) }.getOrNull() ?: return null
    val host = uri.host?.lowercase() ?: return null
    if (!uri.scheme.equals("https", ignoreCase = true)) return null
    if (CALL_HOSTS.none { host == it || host.endsWith(".$it") }) return null
    if (resources.isEmpty() || resources.any { it !in MEDIA_RESOURCES }) return null
    return resources.distinct()
}

private val MEDIA_RESOURCES = setOf(
    PermissionRequest.RESOURCE_VIDEO_CAPTURE,
    PermissionRequest.RESOURCE_AUDIO_CAPTURE,
)

/** The Android runtime permission a granted web resource needs. */
fun androidPermissionFor(resource: String): String = when (resource) {
    PermissionRequest.RESOURCE_VIDEO_CAPTURE -> Manifest.permission.CAMERA
    else -> Manifest.permission.RECORD_AUDIO
}
