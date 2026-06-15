import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  DeviceEventEmitter,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { api } from "../api/api";
import { ALERT_LIST_CHANGED_EVENT } from "../services/callEventService";
import { RiskLevel } from "@escronet/shared";
import type { AlertRecord, AlertNotificationRecord } from "@escronet/shared";

// ── shared helpers ───────────────────────────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  [RiskLevel.LOWEST]: "#4CAF50",
  [RiskLevel.LOW]:    "#8BC34A",
  [RiskLevel.MEDIUM]: "#FF9800",
  [RiskLevel.HIGH]:   "#F44336",
  [RiskLevel.HIGHEST]:"#B71C1C",
};

const RISK_I18N_KEY: Record<string, string> = {
  [RiskLevel.LOWEST]: "alerts.riskLowest",
  [RiskLevel.LOW]:    "alerts.riskLow",
  [RiskLevel.MEDIUM]: "alerts.riskMedium",
  [RiskLevel.HIGH]:   "alerts.riskHigh",
  [RiskLevel.HIGHEST]:"alerts.riskHighest",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function shortHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
}

type TFunc = ReturnType<typeof useTranslation>["t"];

function formatDuration(t: TFunc, seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return t("alerts.durationHoursAndMins", { h, m });
  if (m > 0) return t("alerts.durationMinsAndSecs", { m, s });
  return t("alerts.durationSecs", { count: s });
}

// ── live duration hook ────────────────────────────────────────────────────────

function useLiveDuration(
  callStartedAt: string | null,
  active: boolean,
  endedAt?: string | null,
): number | null {
  const compute = () => {
    if (!callStartedAt) return null;
    const end = !active && endedAt ? new Date(endedAt).getTime() : Date.now();
    return Math.floor((end - new Date(callStartedAt).getTime()) / 1000);
  };

  const [elapsed, setElapsed] = useState<number | null>(compute);

  useEffect(() => {
    setElapsed(compute());
    if (!active || !callStartedAt) return;
    const id = setInterval(() => setElapsed(compute()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStartedAt, active, endedAt]);

  return elapsed;
}

// ── active pulse wrapper ──────────────────────────────────────────────────────

function ActivePulse({ active, children }: { active: boolean; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) { opacity.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => { anim.stop(); opacity.setValue(1); };
  }, [active, opacity]);

  if (!active) return <>{children}</>;
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

// ── My Alert card ─────────────────────────────────────────────────────────────

function effectiveCallStart(
  callStartedAt: string | null,
  detectedAt: string,
  callDuration: number | null,
): string | null {
  if (callStartedAt) return callStartedAt;
  if (callDuration == null) return null;
  return new Date(new Date(detectedAt).getTime() - callDuration * 1000).toISOString();
}

function MyAlertCard({ item }: { item: AlertRecord }) {
  const { t } = useTranslation();
  const active = item.status === "active";
  const riskColor = RISK_COLOR[item.riskLevel] ?? "#546E7A";
  const riskLabel = t(RISK_I18N_KEY[item.riskLevel] ?? "alerts.riskLow");
  const startedAt = effectiveCallStart(item.callStartedAt, item.detectedAt, item.callDuration);
  const liveSecs = useLiveDuration(startedAt, active, item.hungAt);
  const duration = liveSecs != null ? formatDuration(t, liveSecs) : null;

  return (
    <ActivePulse active={active}>
      <View style={[styles.card, active && styles.cardActive]}>
        <View style={[styles.riskBar, { backgroundColor: active ? "#FF6F00" : riskColor }]} />
        <View style={styles.cardBody}>
          <View style={styles.topRow}>
            <View style={[styles.riskBadge, { backgroundColor: riskColor + "22", borderColor: riskColor }]}>
              <Text style={[styles.riskBadgeText, { color: riskColor }]}>{riskLabel}</Text>
            </View>
            {active && (
              <View style={[styles.riskBadge, styles.liveBadge]}>
                <Text style={[styles.riskBadgeText, styles.liveBadgeText]}>● LIVE</Text>
              </View>
            )}
            <Text style={styles.timeText}>{timeAgo(item.detectedAt)}</Text>
          </View>

          <View style={styles.midRow}>
            <Text style={styles.callerLabel}>{t("alerts.callerLabel")}</Text>
            <Text style={styles.callerHash}>{shortHash(item.callerHash)}</Text>
          </View>

          {item.category && (
            <Text style={styles.categoryText}>
              {t("alerts.category")}: {item.category}
            </Text>
          )}

          {item.transcriptSnippet && (
            <Text style={styles.snippet} numberOfLines={2}>
              "{item.transcriptSnippet}"
            </Text>
          )}

          {duration != null && (
            <View style={styles.bottomRow}>
              <Text style={[styles.durationText, active && styles.durationActive]}>
                {active ? `▶ ${duration}` : duration}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ActivePulse>
  );
}

// ── Guardian notification card ────────────────────────────────────────────────

function GuardianCard({
  item,
  onMarkSeen,
  pending,
}: {
  item: AlertNotificationRecord;
  onMarkSeen: (id: string) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const active = item.alert.status === "active";
  const riskColor = RISK_COLOR[item.alert.riskLevel] ?? "#546E7A";
  const riskLabel = t(RISK_I18N_KEY[item.alert.riskLevel] ?? "alerts.riskLow");
  const unseen = !item.seen;
  const startedAt = effectiveCallStart(item.alert.callStartedAt, item.alert.detectedAt, item.alert.callDuration);
  const liveSecs = useLiveDuration(startedAt, active, item.alert.hungAt);
  const duration = liveSecs != null ? formatDuration(t, liveSecs) : null;

  return (
    <ActivePulse active={active}>
      <TouchableOpacity
        style={[styles.card, unseen && styles.cardUnseen, active && styles.cardActive]}
        activeOpacity={unseen ? 0.7 : 1}
        onPress={() => { if (unseen && !pending) onMarkSeen(item.id); }}
      >
        <View style={[styles.riskBar, { backgroundColor: active ? "#FF6F00" : riskColor }]} />
        <View style={styles.cardBody}>
          <View style={styles.topRow}>
            <View style={[styles.riskBadge, { backgroundColor: riskColor + "22", borderColor: riskColor }]}>
              <Text style={[styles.riskBadgeText, { color: riskColor }]}>{riskLabel}</Text>
            </View>
            {active && (
              <View style={[styles.riskBadge, styles.liveBadge]}>
                <Text style={[styles.riskBadgeText, styles.liveBadgeText]}>● LIVE</Text>
              </View>
            )}
            <Text style={styles.timeText}>{timeAgo(item.alert.detectedAt)}</Text>
            {unseen && <View style={styles.unseenDot} />}
          </View>

          <View style={styles.midRow}>
            <Text style={styles.callerLabel}>{t("alerts.callerLabel")}</Text>
            <Text style={styles.callerHash}>{shortHash(item.alert.callerHash)}</Text>
          </View>

          {item.alert.category && (
            <Text style={styles.categoryText}>
              {t("alerts.category")}: {item.alert.category}
            </Text>
          )}

          {item.alert.transcriptSnippet && (
            <Text style={styles.snippet} numberOfLines={2}>
              "{item.alert.transcriptSnippet}"
            </Text>
          )}

          <View style={styles.bottomRow}>
            {unseen && <Text style={styles.tapHint}>{t("alerts.tapToMarkSeen")}</Text>}
            {duration != null && (
              <Text style={[styles.durationText, active && styles.durationActive]}>
                {active ? `▶ ${duration}` : duration}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </ActivePulse>
  );
}

// ── grouping helpers ─────────────────────────────────────────────────────────

type GuardianGroup = {
  protectedUserId: string;
  label: string | null;
  items: AlertNotificationRecord[];
};

function alertTime(n: AlertNotificationRecord): number {
  return new Date(n.alert.callStartedAt ?? n.alert.detectedAt).getTime();
}

function groupByUser(notifications: AlertNotificationRecord[]): GuardianGroup[] {
  const map = new Map<string, GuardianGroup>();
  for (const n of notifications) {
    const g = map.get(n.protectedUserId);
    if (g) {
      g.items.push(n);
    } else {
      map.set(n.protectedUserId, { protectedUserId: n.protectedUserId, label: n.protectedUserLabel, items: [n] });
    }
  }
  return [...map.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => alertTime(b) - alertTime(a)),
    }))
    .sort((a, b) => {
      if (a.label && !b.label) return -1;
      if (!a.label && b.label) return 1;
      return (a.label ?? "").localeCompare(b.label ?? "");
    });
}

// ── main screen ───────────────────────────────────────────────────────────────

export function AlertsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ["myAlerts"] });
      void queryClient.invalidateQueries({ queryKey: ["alertNotifications"] });
    }, [queryClient]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(ALERT_LIST_CHANGED_EVENT, () => {
      void queryClient.invalidateQueries({ queryKey: ["myAlerts"] });
      void queryClient.invalidateQueries({ queryKey: ["alertNotifications"] });
    });
    return () => sub.remove();
  }, [queryClient]);

  const myAlertsQ = useQuery({
    queryKey: ["myAlerts"],
    queryFn: () => api.alerts.listMine(),
  });

  const notificationsQ = useQuery({
    queryKey: ["alertNotifications"],
    queryFn: () => api.alerts.listNotifications(),
  });

  const markSeenMutation = useMutation({
    mutationFn: (id: string) => api.alerts.markSeen(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["alertNotifications"] });
    },
  });

  const isLoading = myAlertsQ.isLoading || notificationsQ.isLoading;
  const isRefetching = myAlertsQ.isRefetching || notificationsQ.isRefetching;

  const refetchAll = () => {
    void myAlertsQ.refetch();
    void notificationsQ.refetch();
  };

  const myAlerts = myAlertsQ.data?.alerts ?? [];
  const notifications = notificationsQ.data?.notifications ?? [];
  const groups = groupByUser(notifications);
  const unseenCount = notifications.filter((n) => !n.seen).length;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4FC3F7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchAll}
            tintColor="#4FC3F7"
            colors={["#4FC3F7"]}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.header}>{t("alerts.title")}</Text>
          {unseenCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unseenCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("alerts.myAlerts")}</Text>

          {myAlertsQ.isError && (
            <TouchableOpacity onPress={() => void myAlertsQ.refetch()}>
              <Text style={styles.errorBanner}>⚠ Failed to load — tap to retry</Text>
            </TouchableOpacity>
          )}

          {myAlerts.length === 0 && !myAlertsQ.isError && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t("alerts.noMyAlerts")}</Text>
            </View>
          )}

          {myAlerts.map((item) => (
            <MyAlertCard key={item.id} item={item} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("alerts.guardingSection")}</Text>

          {notificationsQ.isError && (
            <TouchableOpacity onPress={() => void notificationsQ.refetch()}>
              <Text style={styles.errorBanner}>⚠ Failed to load — tap to retry</Text>
            </TouchableOpacity>
          )}

          {groups.length === 0 && !notificationsQ.isError && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t("alerts.noGuarding")}</Text>
              <Text style={styles.emptyBody}>{t("alerts.noGuardingSub")}</Text>
            </View>
          )}

          {groups.map((group) => (
            <View key={group.protectedUserId} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>
                  {group.label ?? t("alerts.unknownUser")}
                </Text>
                <Text style={styles.groupSub}>
                  {group.items.length} alert{group.items.length !== 1 ? "s" : ""}
                </Text>
              </View>
              {group.items.map((item) => (
                <GuardianCard
                  key={item.id}
                  item={item}
                  onMarkSeen={(id) => markSeenMutation.mutate(id)}
                  pending={markSeenMutation.isPending}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: "#0D1B2A" },
  centered:      { flex: 1, justifyContent: "center", alignItems: "center" },
  container:     { padding: 24, paddingBottom: 40, gap: 24 },

  headerRow:     { flexDirection: "row", alignItems: "center", gap: 10 },
  header:        { color: "#FFFFFF", fontSize: 28, fontWeight: "700", flex: 1 },
  badge:         { backgroundColor: "#F44336", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:     { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  section:       { gap: 10 },
  sectionTitle:  { color: "#4FC3F7", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },

  emptyCard:     { backgroundColor: "#0F2A40", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#1E3A5F", gap: 4 },
  emptyTitle:    { color: "#90A4AE", fontSize: 14 },
  emptyBody:     { color: "#546E7A", fontSize: 12, lineHeight: 18 },

  errorBanner:   { color: "#EF5350", fontSize: 13, backgroundColor: "#1A0A0A", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#EF5350" },

  group:         { gap: 8 },
  groupHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 },
  groupTitle:    { color: "#ECEFF1", fontSize: 14, fontWeight: "600" },
  groupSub:      { color: "#546E7A", fontSize: 11 },

  card:          {
    backgroundColor: "#0F2A40",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    flexDirection: "row",
    overflow: "hidden",
  },
  cardUnseen:    { borderColor: "#4FC3F7", backgroundColor: "#0A2035" },
  cardActive:    { borderColor: "#FF6F00", backgroundColor: "#1A1200" },
  riskBar:       { width: 4 },
  cardBody:      { flex: 1, padding: 14, gap: 8 },

  topRow:        { flexDirection: "row", alignItems: "center", gap: 8 },
  riskBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  riskBadgeText: { fontSize: 11, fontWeight: "700" },
  liveBadge:     { backgroundColor: "#FF6F0022", borderColor: "#FF6F00" },
  liveBadgeText: { color: "#FF6F00" },
  timeText:      { color: "#546E7A", fontSize: 11, flex: 1, textAlign: "right" },
  unseenDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4FC3F7" },

  midRow:        { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  callerLabel:   { color: "#546E7A", fontSize: 11 },
  callerHash:    { color: "#90A4AE", fontSize: 12, fontFamily: "monospace" },
  bottomRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  durationText:  { color: "#546E7A", fontSize: 11, marginLeft: "auto" },
  durationActive:{ color: "#FF6F00", fontWeight: "700" },

  categoryText:  { color: "#78909C", fontSize: 11, fontStyle: "italic" },
  snippet:       { color: "#90A4AE", fontSize: 12, lineHeight: 18, fontStyle: "italic" },
  tapHint:       { color: "#4FC3F7", fontSize: 10, opacity: 0.7 },
});
