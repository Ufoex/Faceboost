package com.eepiemi.materialbook.utils

import android.content.Context
import android.os.Build
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL

/** Fingerprint or face, or the phone's PIN/pattern (Android 11+, where the two can be combined). */
fun appLockAuthenticators(): Int =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) BIOMETRIC_WEAK or DEVICE_CREDENTIAL else BIOMETRIC_WEAK

/** True when the phone has a screen lock or biometric the app lock can ask for. */
fun canUseAppLock(context: Context): Boolean =
    BiometricManager.from(context).canAuthenticate(appLockAuthenticators()) == BiometricManager.BIOMETRIC_SUCCESS

/** Seconds in the background after which the app locks again. */
const val APP_LOCK_GRACE_MS = 15_000L

/**
 * Asks for the fingerprint, face or phone PIN. [onResult] gets true only when the person was
 * verified; a cancel or an error gives false.
 */
fun authenticateUser(activity: FragmentActivity, title: String, onResult: (Boolean) -> Unit) {
    val prompt = BiometricPrompt(
        activity, ContextCompat.getMainExecutor(activity),
        object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = onResult(true)
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) = onResult(false)
        }
    )
    val authenticators = appLockAuthenticators()
    prompt.authenticate(
        BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setAllowedAuthenticators(authenticators)
            .apply {
                // The negative button can't be combined with the phone PIN as an authenticator.
                if (authenticators and DEVICE_CREDENTIAL == 0) setNegativeButtonText(activity.getString(android.R.string.cancel))
            }
            .build()
    )
}
