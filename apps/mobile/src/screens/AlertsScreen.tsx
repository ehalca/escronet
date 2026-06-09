import React from "react";
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from "react-native";
import { useTranslation } from "react-i18next";

export function AlertsScreen(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <View style={styles.container}>
        <Text style={styles.header}>{t("alerts.title")}</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔕</Text>
          <Text style={styles.emptyTitle}>{t("alerts.emptyTitle")}</Text>
          <Text style={styles.emptySubtitle}>{t("alerts.emptySubtitle")}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0D1B2A" },
  container: { flex: 1, padding: 24 },
  header: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  emptySubtitle: { color: "#607D8B", fontSize: 14, textAlign: "center" },
});
