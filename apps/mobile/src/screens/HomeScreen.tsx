import React, { useState } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useTranslation } from "react-i18next";
import { MMKV } from "react-native-mmkv";

const storage = new MMKV({ id: "migration" });

export function HomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [protectionEnabled, setProtectionEnabled] = useState(true);
  const lastSyncAt = storage.getString("lastSyncAt");

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString()
    : t("home.never");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <View style={styles.container}>
        <View style={styles.statusCard}>
          <View style={[styles.statusDot, protectionEnabled ? styles.dotActive : styles.dotInactive]} />
          <Text style={styles.statusTitle}>
            {protectionEnabled ? t("home.protectionActive") : t("home.protectionDisabled")}
          </Text>
          <Text style={styles.statusSubtitle}>
            {protectionEnabled
              ? t("home.protectionActiveSubtitle")
              : t("home.protectionDisabledSubtitle")}
          </Text>
          <Switch
            value={protectionEnabled}
            onValueChange={setProtectionEnabled}
            trackColor={{ false: "#37474F", true: "#1565C0" }}
            thumbColor={protectionEnabled ? "#4FC3F7" : "#607D8B"}
            style={styles.toggle}
          />
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t("home.lastSync")}</Text>
          <Text style={styles.infoValue}>{lastSyncLabel}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0D1B2A" },
  container: { flex: 1, padding: 24, gap: 16 },
  statusCard: {
    backgroundColor: "#0F2A40",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#1E3A5F",
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 4,
  },
  dotActive: { backgroundColor: "#4CAF50" },
  dotInactive: { backgroundColor: "#607D8B" },
  statusTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  statusSubtitle: {
    color: "#90A4AE",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  toggle: { marginTop: 12 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0F2A40",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E3A5F",
  },
  infoLabel: { color: "#90A4AE", fontSize: 14 },
  infoValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
