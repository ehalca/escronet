import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { MMKV } from "react-native-mmkv";
import { syncCallers } from "../services/migrationService";
import { getAnalyzerControlModule } from "../native/modules";

const migrationStorage = new MMKV({ id: "migration" });
const settingsStorage = new MMKV({ id: "settings" });

const ANALYZER_ENABLED_KEY = "analyzerEnabled";

export function HomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [protectionEnabled, setProtectionEnabled] = useState(
    () => settingsStorage.getBoolean(ANALYZER_ENABLED_KEY) ?? true,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(migrationStorage.getString("lastSyncAt"));

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString()
    : t("home.never");

  useEffect(() => {
    void syncCallers();
  }, []);

  const handleProtectionToggle = useCallback((value: boolean) => {
    setProtectionEnabled(value);
    settingsStorage.set(ANALYZER_ENABLED_KEY, value);
    if (Platform.OS === "android") {
      void getAnalyzerControlModule()?.setEnabled(value);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncCallers();
      setLastSyncAt(migrationStorage.getString("lastSyncAt"));
    } catch {
      // sync failure is non-fatal; user can try again
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4FC3F7"
            colors={["#4FC3F7"]}
          />
        }
      >
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
            onValueChange={handleProtectionToggle}
            trackColor={{ false: "#37474F", true: "#1565C0" }}
            thumbColor={protectionEnabled ? "#4FC3F7" : "#607D8B"}
            style={styles.toggle}
          />
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t("home.lastSync")}</Text>
          <Text style={styles.infoValue}>{lastSyncLabel}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0D1B2A" },
  container: { flexGrow: 1, padding: 24, gap: 16 },
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
