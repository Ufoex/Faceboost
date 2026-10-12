package com.eepiemi.materialbook.utils

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.view.View
import com.eepiemi.materialbook.R
import androidx.core.net.toUri
import androidx.compose.ui.res.stringResource
import androidx.compose.material3.TextButton
import androidx.compose.material3.Text
import androidx.compose.material3.AlertDialog
import android.provider.Settings
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebView
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.ActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.multiplatform.webview.web.AccompanistWebChromeClient
import com.multiplatform.webview.web.PlatformWebViewParams

// src: https://github.com/KevinnZou/compose-webview-multiplatform

@Composable
fun appWebViewParams(fullscreen: FullscreenController): PlatformWebViewParams {
    var fileChooserIntent by remember { mutableStateOf<Intent?>(null) }

    // Messenger calls: the camera/microphone request waiting for Android's permission prompt.
    val context = LocalContext.current
    var pendingMediaRequest by remember { mutableStateOf<PendingMediaRequest?>(null) }
    // Set when the user said no to the camera or microphone: a window sends them to the app's
    // settings to turn it on (Android stops asking after a refusal).
    var showMediaSettingsDialog by remember { mutableStateOf(false) }
    val mediaPermissionLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
            val pending = pendingMediaRequest ?: return@rememberLauncherForActivityResult
            pendingMediaRequest = null
            pending.grantWhatAndroidAllows(context)
            if (pending.missingPermissions(context).isNotEmpty()) showMediaSettingsDialog = true
        }
    if (showMediaSettingsDialog) {
        AlertDialog(
            onDismissRequest = { showMediaSettingsDialog = false },
            title = { Text(stringResource(R.string.media_permission_title)) },
            text = { Text(stringResource(R.string.media_permission_text)) },
            confirmButton = {
                TextButton(onClick = {
                    showMediaSettingsDialog = false
                    runCatching {
                        context.startActivity(
                            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, "package:${context.packageName}".toUri())
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        )
                    }
                }) { Text(stringResource(R.string.media_permission_open_settings)) }
            },
            dismissButton = {
                TextButton(onClick = { showMediaSettingsDialog = false }) { Text(stringResource(android.R.string.cancel)) }
            }
        )
    }

    val webViewChromeClient =
        remember(fullscreen) {
            AppWebChromeClient(
                fullscreen,
                onShowFilePicker = { fileChooserIntent = it },
                onMediaRequest = { request, resources ->
                    val pending = PendingMediaRequest(request, resources)
                    val missing = pending.missingPermissions(context)
                    if (missing.isEmpty()) {
                        pending.grantWhatAndroidAllows(context)
                    } else {
                        // One prompt at a time: a newer request replaces (and denies) an older one.
                        pendingMediaRequest?.request?.deny()
                        pendingMediaRequest = pending
                        runCatching { mediaPermissionLauncher.launch(missing) }
                            .onFailure { pendingMediaRequest = null; request.deny() }
                    }
                },
                onMediaRequestCanceled = { request ->
                    if (pendingMediaRequest?.request == request) pendingMediaRequest = null
                },
            )
        }

    val webViewClient = remember { BlockingWebViewClient() }

    val launcher =
        rememberLauncherForActivityResult(
            contract = ActivityResultContracts.StartActivityForResult(),
        ) { result: ActivityResult ->
            if (result.resultCode != Activity.RESULT_OK) {
                webViewChromeClient.cancelFileChooser()
                return@rememberLauncherForActivityResult
            }

            val intent = result.data
            if (intent == null) {
                webViewChromeClient.cancelFileChooser()
                return@rememberLauncherForActivityResult
            }

            val singleFile: Uri? = intent.data
            val multiFiles: List<Uri>? = intent.getUris()

            when {
                singleFile != null -> webViewChromeClient.onReceiveFiles(arrayOf(singleFile))
                multiFiles != null -> webViewChromeClient.onReceiveFiles(multiFiles.toTypedArray())
                else -> {
                    webViewChromeClient.cancelFileChooser()
                }
            }
        }

    LaunchedEffect(key1 = fileChooserIntent) {
        fileChooserIntent?.let {
            try {
                launcher.launch(fileChooserIntent!!)
            } catch (_: ActivityNotFoundException) {
                webViewChromeClient.cancelFileChooser()
            }
        }
    }

    return PlatformWebViewParams(client = webViewClient, chromeClient = webViewChromeClient)
}

private fun Intent.getUris(): List<Uri>? {
    val clipData = clipData ?: return null
    return (0 until clipData.itemCount).map { clipData.getItemAt(it).uri }
}

/** A page's camera/microphone request and the web resources it may get (see webMediaGrant). */
private class PendingMediaRequest(val request: PermissionRequest, val resources: List<String>) {
    fun missingPermissions(context: Context): Array<String> =
        resources.map(::androidPermissionFor).distinct()
            .filter { ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED }
            .toTypedArray()

    // Grants each resource whose runtime permission the app holds; denies if none.
    fun grantWhatAndroidAllows(context: Context) {
        val allowed = resources.filter {
            ContextCompat.checkSelfPermission(context, androidPermissionFor(it)) == PackageManager.PERMISSION_GRANTED
        }
        runCatching {
            if (allowed.isEmpty()) request.deny() else request.grant(allowed.toTypedArray())
        }
    }
}

private class AppWebChromeClient(
    private val fullscreen: FullscreenController,
    private val onShowFilePicker: (Intent) -> Unit,
    private val onMediaRequest: (PermissionRequest, List<String>) -> Unit,
    private val onMediaRequestCanceled: (PermissionRequest) -> Unit,
) : AccompanistWebChromeClient() {
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // HTML5 fullscreen: without these two, element.requestFullscreen() from
    // the page (Facebook's fullscreen button) goes nowhere.
    override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
        if (view == null || callback == null) return
        fullscreen.show(view, callback)
    }

    // Camera and microphone for Messenger calls: Facebook's own pages only (webMediaGrant), and
    // only once Android has given the app the matching permission. Everything else is denied.
    override fun onPermissionRequest(request: PermissionRequest) {
        val resources = webMediaGrant(request.origin.toString(), request.resources)
        if (resources == null) request.deny() else onMediaRequest(request, resources)
    }

    override fun onPermissionRequestCanceled(request: PermissionRequest) {
        onMediaRequestCanceled(request)
    }

    override fun onHideCustomView() {
        fullscreen.hide()
    }

    override fun onShowFileChooser(
        webView: WebView?,
        filePathCallback: ValueCallback<Array<Uri>>?,
        fileChooserParams: FileChooserParams?,
    ): Boolean {
        this.filePathCallback = filePathCallback
        val filePickerIntent = fileChooserParams?.createIntent()

        if (filePickerIntent == null) cancelFileChooser()
        else onShowFilePicker(filePickerIntent)

        return true
    }

    fun onReceiveFiles(uris: Array<Uri>) {
        filePathCallback?.onReceiveValue(uris)
        filePathCallback = null
    }

    fun cancelFileChooser() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
    }
}