import React, { useEffect, useRef, useState } from "react";
import { Animated, DeviceEventEmitter, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const EVENT_SMS_OTP = "sms_otp_during_call";
const EVENT_CALL_ENDED = "call_ended";

export function SmsOtpBanner(): React.JSX.Element | null {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const show = DeviceEventEmitter.addListener(EVENT_SMS_OTP, () => setVisible(true));
    const hide = DeviceEventEmitter.addListener(EVENT_CALL_ENDED, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.55, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [visible, pulse]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.card, { opacity: pulse }]}>
        <Text style={styles.icon}>⚠</Text>
        <Text style={styles.title}>{t("smsBanner.title")}</Text>
        <Text style={styles.body}>{t("smsBanner.body")}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    elevation: 99,
  },
  card: {
    width: "85%",
    height: "50%",
    backgroundColor: "#B71C1C",
    borderRadius: 20,
    padding: 28,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    shadowColor: "#FF1744",
    shadowOpacity: 0.85,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 20,
    borderWidth: 1.5,
    borderColor: "#FF1744",
  },
  icon: {
    fontSize: 52,
    color: "#FFFFFF",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  body: {
    color: "#FFCDD2",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
