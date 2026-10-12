package com.eepiemi.materialbook.utils

import android.content.Context
import android.os.Build
import androidx.biometric.BiometricManager
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
