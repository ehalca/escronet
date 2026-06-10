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
} from "react-native";
import { useTranslation } from "react-i18next";
import { MMKV } from "react-native-mmkv";
import type { CallerDeltaRecord } from "@escronet/shared";
import { syncCallers } from "../services/migrationService";
import { getAllCallers } from "../storage/callerStore";

const storage = new MMKV({ id: "migration" });

export function HomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [protectionEnabled, setProtectionEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(storage.getString("lastSyncAt"));
  const [callers, setCallers] = useState<CallerDeltaRecord[]>([]);

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString()
    : t("home.never");

  const loadCallers = useCallback(async () => {
    setCallers(await getAllCallers());
  }, []);

  useEffect(() => {
    void loadCallers();
  }, [loadCallers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncCallers();
      setLastSyncAt(storage.getString("lastSyncAt"));
      await loadCallers();
    } catch {
      // sync failure is non-fatal; user can try again
    } finally {
      setRefreshing(false);
    }
  }, [loadCallers]);

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

        {/* DEV: caller store inspector */}
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>
            Callers in store ({callers.length})
          </Text>
          <View style={styles.debugHeaderRow}>
            <Text style={[styles.debugCell, styles.debugHeader, { flex: 2 }]}>Phone</Text>
            <Text style={[styles.debugCell, styles.debugHeader, { flex: 1 }]}>Risk</Text>
            <Text style={[styles.debugCell, styles.debugHeader, { flex: 2 }]}>Updated</Text>
          </View>
          {callers.length === 0 ? (
            <Text style={styles.debugEmpty}>No callers synced yet</Text>
          ) : (
            callers.map((c) => (
              <View key={c.id} style={styles.debugRow}>
                <Text style={[styles.debugCell, { flex: 2 }]} numberOfLines={1}>
                  {c.phoneNumber}
                </Text>
                <Text style={[styles.debugCell, styles.debugRisk, { flex: 1 }]} numberOfLines={1}>
                  {c.riskLevel}
                </Text>
                <Text style={[styles.debugCell, styles.debugMuted, { flex: 2 }]} numberOfLines={1}>
                  {new Date(c.updatedAt).toLocaleTimeString()}
                </Text>
              </View>
            ))
          )}
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
  debugCard: {
    backgroundColor: "#0F2A40",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    gap: 4,
  },
  debugTitle: { color: "#4FC3F7", fontSize: 13, fontWeight: "700", marginBottom: 4 },
  debugHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1E3A5F", paddingBottom: 4, marginBottom: 2 },
  debugRow: { flexDirection: "row", paddingVertical: 3 },
  debugCell: { color: "#FFFFFF", fontSize: 11 },
  debugHeader: { color: "#90A4AE", fontWeight: "700" },
  debugRisk: { color: "#FFB74D" },
  debugMuted: { color: "#607D8B" },
  debugEmpty: { color: "#607D8B", fontSize: 12, fontStyle: "italic", paddingVertical: 8, textAlign: "center" },
});
