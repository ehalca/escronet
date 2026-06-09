import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useTranslation } from "react-i18next";

export function GuardianScreen(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <View style={styles.container}>
        <Text style={styles.header}>{t("guardian.title")}</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🛡️</Text>
          <Text style={styles.infoTitle}>{t("guardian.noGuardian")}</Text>
          <Text style={styles.infoBody}>{t("guardian.noGuardianBody")}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0D1B2A" },
  container: { flex: 1, padding: 24, gap: 24 },
  header: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  infoCard: {
    backgroundColor: "#0F2A40",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#1E3A5F",
  },
  infoIcon: { fontSize: 40 },
  infoTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  infoBody: {
    color: "#90A4AE",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
