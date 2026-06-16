package com.escronet

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AnalyzerControlModule(context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    override fun getName(): String = "AnalyzerControl"

    @ReactMethod
    fun setEnabled(enabled: Boolean, promise: Promise) {
        val ctx = reactApplicationContext
        ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ENABLED, enabled)
            .apply()

        if (enabled) {
            ContextCompat.startForegroundService(
                ctx,
                Intent(ctx, CallDetectionForegroundService::class.java)
            )
        } else {
            ctx.stopService(Intent(ctx, CallDetectionForegroundService::class.java))
        }
        promise.resolve(null)
    }

    companion object {
        const val PREFS_NAME = "escronet_prefs"
        const val KEY_ENABLED = "analyzer_enabled"

        fun isEnabled(context: Context): Boolean =
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getBoolean(KEY_ENABLED, true)
    }
}
