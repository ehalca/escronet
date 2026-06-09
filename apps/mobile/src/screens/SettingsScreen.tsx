import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SettingsStackParamList } from "../navigation/types";
import { getUserId } from "../storage/authStore";

type Props = {
  navigation: NativeStackNavigationProp<SettingsStackParamList, "SettingsMain">;
};

export function SettingsScreen({ navigation }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const userId = getUserId();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <View style={styles.container}>
        <Section title={t("settings.sectionProtection")}>
          <SettingsRow
            label={t("settings.guardianSetup")}
            sublabel={t("settings.guardianSetupSubtitle")}
            onPress={() => navigation.navigate("Guardian")}
            hasChevron
          />
        </Section>

        <Section title={t("settings.sectionAccount")}>
          <SettingsRow label={t("settings.deviceId")} sublabel={userId ?? "—"} />
        </Section>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsRow({
  label,
  sublabel,
  onPress,
  hasChevron,
}: {
  label: string;
  sublabel?: string;
  onPress?: () => void;
  hasChevron?: boolean;
}): React.JSX.Element {
  const content = (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel} numberOfLines={1}>{sublabel}</Text> : null}
      </View>
      {hasChevron ? <Text style={styles.chevron}>›</Text> : null}
    </View>
  );

  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0D1B2A" },
  container: { flex: 1, padding: 24, gap: 24 },
  section: { gap: 8 },
  sectionTitle: {
    color: "#607D8B",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: "#0F2A40",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E3A5F",
  },
  rowText: { flex: 1 },
  rowLabel: { color: "#FFFFFF", fontSize: 16 },
  rowSublabel: { color: "#607D8B", fontSize: 12, marginTop: 2 },
  chevron: { color: "#607D8B", fontSize: 22, marginLeft: 8 },
});
