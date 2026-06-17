package com.escronet

import android.animation.ValueAnimator
import android.app.Notification
import android.app.NotificationChannel
import android.util.Log
import android.app.NotificationManager
import android.app.ActivityManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.ContactsContract
import android.provider.Settings
import android.provider.Telephony
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class CallDetectionForegroundService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private var alertRunnable: Runnable? = null
    private var guardianRunnable: Runnable? = null
    private var pendingNumber: String? = null

    // Set to true while monitoring a call from an unsaved contact
    private var isMonitoringCall = false
    private var callStartedAt: String? = null
    private var smsReceiver: BroadcastReceiver? = null

    // System-level overlay shown over any foreground app
    private var overlayView: android.view.View? = null
    private var overlayAnimator: ValueAnimator? = null

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
        unregisterSmsReceiver()
        hideOtpOverlay()
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
        Log.d(TAG, "onRinging: number=$phoneNumber")
        pendingNumber = phoneNumber
        cancelAlert()
        val label = phoneNumber.ifEmpty { getString(R.string.notification_unknown_number) }
        updateForegroundNotification(getString(R.string.notification_incoming_call, label))
    }

    private fun onAnswered() {
        val number = pendingNumber ?: return
        val contactName = lookupContactName(number)
        Log.d(TAG, "onAnswered: number=$number contactName=$contactName")
        if (contactName == null) {
            isMonitoringCall = true
            callStartedAt = nowIso()
            registerSmsReceiver()

            alertRunnable = Runnable { postAlert(number) }
            handler.postDelayed(alertRunnable!!, ALERT_DELAY_MS)

            guardianRunnable = Runnable { emitGuardianThreshold(number) }
            handler.postDelayed(guardianRunnable!!, GUARDIAN_THRESHOLD_MS)
        }
    }

    private fun onIdle() {
        Log.d(TAG, "onIdle: isMonitoringCall=$isMonitoringCall")
        if (isMonitoringCall) {
            isMonitoringCall = false
            callStartedAt = null
            unregisterSmsReceiver()
            hideOtpOverlay()
            emitEvent(EVENT_CALL_ENDED, null)
        }
        cancelAlert()
        pendingNumber = null
        updateForegroundNotification(null)
    }

    private fun cancelAlert() {
        alertRunnable?.let { handler.removeCallbacks(it) }
        alertRunnable = null
        guardianRunnable?.let { handler.removeCallbacks(it) }
        guardianRunnable = null
    }

    private fun postAlert(phoneNumber: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(
            ALERT_NOTIF_ID,
            NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(getString(R.string.notification_alert_title))
                .setContentText(getString(R.string.notification_alert_body, phoneNumber))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build()
        )
    }

    private fun emitGuardianThreshold(phoneNumber: String) {
        val params = Arguments.createMap().apply {
            putString("callerHash", hashPhoneNumber(phoneNumber))
            putInt("callDuration", GUARDIAN_THRESHOLD_SECONDS)
            putString("detectedAt", nowIso())
            putString("callStartedAt", callStartedAt ?: nowIso())
        }
        emitEvent(EVENT_CALL_THRESHOLD, params)
    }

    // ── SMS OTP detection ───────────────────────────────────────────────────────

    private fun registerSmsReceiver() {
        Log.d(TAG, "registerSmsReceiver: registering")
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                Log.d(TAG, "SMS BroadcastReceiver.onReceive isMonitoringCall=$isMonitoringCall")
                if (!isMonitoringCall) return
                val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
                for (msg in messages) {
                    val body = msg.messageBody ?: continue
                    val isOtp = isOtpMessage(body)
                    Log.d(TAG, "SMS body='$body' isOtp=$isOtp")
                    if (isOtp) {
                        emitEvent(EVENT_SMS_OTP, null)
                        val riskParams = Arguments.createMap().apply {
                            putString("riskLevel", "highest")
                            putString("callerHash", hashPhoneNumber(pendingNumber ?: ""))
                            putString("callStartedAt", callStartedAt ?: nowIso())
                            putString("detectedAt", nowIso())
                        }
                        emitEvent(EVENT_RISK_ESCALATED, riskParams)
                        showOtpOverlay()
                        break
                    }
                }
            }
        }
        smsReceiver = receiver
        val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(receiver, filter, RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(receiver, filter)
        }
    }

    private fun unregisterSmsReceiver() {
        smsReceiver?.let {
            try { unregisterReceiver(it) } catch (_: Exception) {}
            smsReceiver = null
        }
    }

    private fun isOtpMessage(body: String): Boolean {
        if (body.length > 500) return false

        // 4–8 consecutive digits, or two 3-digit groups split by space/dash (e.g. "123 456", "123-456")
        val hasCode = Regex("""\b\d{4,8}\b|\b\d{3}[\s\-]\d{3}\b""").containsMatchIn(body)
        if (!hasCode) return false

        // Latin / Romanian keywords — word-boundary anchored
        val latinKeywords = Regex(
            """(?i)\b(""" +
            // generic OTP terms
            """otp|opt|one.?time|passcode|passkey|passwd|password|secret|""" +
            // action words
            """verif\w*|auth\w*|confirm\w*|activat\w*|""" +
            // descriptor words
            """security|access|token|temp\w*|code|pin|""" +
            // Romanian
            """cod\w*|parola|verificare|acces|temporar|cheie|secret""" +
            """)\b"""
        )

        // Cyrillic keywords — no \b (ASCII word boundary doesn't apply to Cyrillic)
        val cyrillicKeywords = Regex(
            """(?i)(код|пин|пароль|ключ|пароль|секрет|одноразов\w*|подтвержд\w*|активац\w*|доступ|токен)"""
        )

        return latinKeywords.containsMatchIn(body) || cyrillicKeywords.containsMatchIn(body)
    }

    // ── System overlay (shown over any foreground app) ──────────────────────────

    private fun isAppForegrounded(): Boolean {
        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        return am.runningAppProcesses?.any {
            it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
                    it.processName == packageName
        } ?: false
    }

    private fun showOtpOverlay() {
        val canDraw = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Settings.canDrawOverlays(this) else true
        val foregrounded = isAppForegrounded()
        Log.d(TAG, "showOtpOverlay: overlayView=${overlayView != null} canDrawOverlays=$canDraw foregrounded=$foregrounded")
        if (overlayView != null) return
        if (!canDraw || foregrounded) {
            return // Foregrounded: RN SmsOtpBanner handles it; no permission: skip overlay
        }

        val dp = resources.displayMetrics.density
        val dm = resources.displayMetrics
        val cardWidth = (dm.widthPixels * 0.85f).toInt()
        val cardHeight = (dm.heightPixels * 0.50f).toInt()
        val cornerRadius = 20 * dp
        val pad = (28 * dp).toInt()

        // Card container — centered, rounded, vertical
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(pad, pad, pad, pad)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#B71C1C"))
                this.cornerRadius = cornerRadius
                setStroke((2 * dp).toInt(), Color.parseColor("#FF1744"))
            }
        }

        root.addView(TextView(this).apply {
            text = "⚠"
            textSize = 48f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        })

        root.addView(TextView(this).apply {
            text = getString(R.string.notification_otp_warning)
            textSize = 18f
            setTextColor(Color.WHITE)
            typeface = Typeface.DEFAULT_BOLD
            letterSpacing = 0.12f
            gravity = Gravity.CENTER
            setPadding(0, (16 * dp).toInt(), 0, 0)
        })

        root.addView(TextView(this).apply {
            text = getString(R.string.notification_otp_body)
            textSize = 14f
            setTextColor(Color.parseColor("#FFCDD2"))
            gravity = Gravity.CENTER
            setLineSpacing(0f, 1.4f)
            setPadding(0, (12 * dp).toInt(), 0, 0)
        })

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            cardWidth,
            cardHeight,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.CENTER
        }

        try {
            (getSystemService(Context.WINDOW_SERVICE) as WindowManager).addView(root, params)
            overlayView = root
            startOverlayPulse()
        } catch (_: Exception) {}
    }

    private fun hideOtpOverlay() {
        stopOverlayPulse()
        overlayView?.let {
            try {
                (getSystemService(Context.WINDOW_SERVICE) as WindowManager).removeView(it)
            } catch (_: Exception) {}
            overlayView = null
        }
    }

    private fun startOverlayPulse() {
        val view = overlayView ?: return
        overlayAnimator = ValueAnimator.ofFloat(1f, 0.45f).apply {
            duration = 600
            repeatMode = ValueAnimator.REVERSE
            repeatCount = ValueAnimator.INFINITE
            addUpdateListener { view.alpha = it.animatedValue as Float }
            start()
        }
    }

    private fun stopOverlayPulse() {
        overlayAnimator?.cancel()
        overlayAnimator = null
        overlayView?.alpha = 1f
    }

    // ── shared event emission ───────────────────────────────────────────────────

    private fun emitEvent(name: String, params: WritableMap?) {
        val reactContext = (applicationContext as? ReactApplication)
            ?.reactNativeHost
            ?.reactInstanceManager
            ?.currentReactContext ?: return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(name, params)
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

    private fun hashPhoneNumber(phoneNumber: String): String {
        val normalized = phoneNumber.replace(Regex("[^+\\d]"), "")
        val bytes = MessageDigest.getInstance("SHA-256").digest(normalized.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun nowIso(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }
            .format(Date())

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
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(if (callText != null) getString(R.string.notification_monitoring_active_title) else getString(R.string.notification_monitoring_idle_title))
            .setContentText(callText ?: getString(R.string.notification_monitoring_idle_body))
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .setContentIntent(pi)
            .build()
    }

    private fun createChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(MONITOR_CHANNEL_ID, getString(R.string.notification_channel_monitoring_name), NotificationManager.IMPORTANCE_MIN)
            )
            nm.createNotificationChannel(
                NotificationChannel(ALERT_CHANNEL_ID, getString(R.string.notification_channel_alerts_name), NotificationManager.IMPORTANCE_HIGH)
            )
        }
    }

    companion object {
        const val TAG = "CallDetectionSvc"
        const val FOREGROUND_NOTIF_ID = 1001
        const val ALERT_NOTIF_ID = 1002
        const val MONITOR_CHANNEL_ID = "call_monitoring"
        const val ALERT_CHANNEL_ID = "call_alerts"
        const val ALERT_TRIGGER_SECONDS = 7
        const val ALERT_DELAY_MS = ALERT_TRIGGER_SECONDS * 1000L
        const val GUARDIAN_THRESHOLD_SECONDS = 30
        const val GUARDIAN_THRESHOLD_MS = GUARDIAN_THRESHOLD_SECONDS * 1000L
        const val EVENT_CALL_THRESHOLD = "call_threshold_reached"
        const val EVENT_SMS_OTP = "sms_otp_during_call"
        const val EVENT_RISK_ESCALATED = "risk_escalated"
        const val EVENT_CALL_ENDED = "call_ended"
    }
}
