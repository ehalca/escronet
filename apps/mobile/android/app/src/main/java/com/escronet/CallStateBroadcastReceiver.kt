package com.escronet

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat

// Restarts CallDetectionForegroundService if it was killed while a call is active.
// Normal operation relies on the service's own PhoneStateListener.
class CallStateBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
        if (!AnalyzerControlModule.isEnabled(context)) return
        ContextCompat.startForegroundService(
            context,
            Intent(context, CallDetectionForegroundService::class.java)
        )
    }
}
