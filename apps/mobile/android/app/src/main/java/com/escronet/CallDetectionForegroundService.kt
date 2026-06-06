package com.escronet

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.ContactsContract
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import androidx.core.app.NotificationCompat

class CallDetectionForegroundService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private var alertRunnable: Runnable? = null
    private var pendingNumber: String? = null

    @Suppress("DEPRECATION")
    private val phoneStateListener = object : PhoneStateListener() {
        @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
        override fun onCallStateChanged(state: Int, phoneNumber: String?) {
            when (state) {
                TelephonyManager.CALL_STATE_RINGING -> onRinging(phoneNumber.orEmpty())
                TelephonyManager.CALL_STATE_OFFHOOK -> onAnswered()
                TelephonyManager.CALL_STATE_IDLE -> onIdle()
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannels()
        startForeground(FOREGROUND_NOTIF_ID, buildIdleNotification())
        registerListener()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        super.onDestroy()
        cancelAlert()
        unregisterListener()
    }

    private fun registerListener() {
        val tm = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        @Suppress("DEPRECATION")
        tm.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE)
    }

    private fun unregisterListener() {
        val tm = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        @Suppress("DEPRECATION")
        tm.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
    }

    private fun onRinging(phoneNumber: String) {
        pendingNumber = phoneNumber
        cancelAlert()
        updateForegroundNotification("Incoming call: ${phoneNumber.ifEmpty { "Unknown" }}")
    }

    private fun onAnswered() {
        val number = pendingNumber ?: return
        if (lookupContactName(number) == null) {
            alertRunnable = Runnable { postAlert(number) }
            handler.postDelayed(alertRunnable!!, ALERT_DELAY_MS)
        }
    }

    private fun onIdle() {
        cancelAlert()
        pendingNumber = null
        updateForegroundNotification(null)
    }

    private fun cancelAlert() {
        alertRunnable?.let { handler.removeCallbacks(it) }
        alertRunnable = null
    }

    private fun postAlert(phoneNumber: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(
            ALERT_NOTIF_ID,
            NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("Unknown caller")
                .setContentText("$phoneNumber is not in your contacts")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build()
        )
    }

    private fun lookupContactName(phoneNumber: String): String? {
        if (phoneNumber.isEmpty()) return null
        val uri = Uri.withAppendedPath(
            ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
            Uri.encode(phoneNumber)
        )
        return contentResolver
            .query(uri, arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME), null, null, null)
            ?.use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else null }
    }

    private fun buildIdleNotification(): Notification = buildMonitorNotification(null)

    private fun updateForegroundNotification(callText: String?) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(FOREGROUND_NOTIF_ID, buildMonitorNotification(callText))
    }

    private fun buildMonitorNotification(callText: String?): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pi = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, MONITOR_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle(if (callText != null) "Call in progress" else "Escronet")
            .setContentText(callText ?: "Monitoring for unknown callers")
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .setContentIntent(pi)
            .build()
    }

    private fun createChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(MONITOR_CHANNEL_ID, "Call Monitoring", NotificationManager.IMPORTANCE_MIN)
            )
            nm.createNotificationChannel(
                NotificationChannel(ALERT_CHANNEL_ID, "Call Alerts", NotificationManager.IMPORTANCE_HIGH)
            )
        }
    }

    companion object {
        const val FOREGROUND_NOTIF_ID = 1001
        const val ALERT_NOTIF_ID = 1002
        const val MONITOR_CHANNEL_ID = "call_monitoring"
        const val ALERT_CHANNEL_ID = "call_alerts"
        const val ALERT_TRIGGER_SECONDS = 7
        const val ALERT_DELAY_MS = ALERT_TRIGGER_SECONDS * 1000L
    }
}
