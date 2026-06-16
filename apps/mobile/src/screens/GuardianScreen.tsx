import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCodeSvg from "react-native-qrcode-svg";
import {
  Camera as VisionCamera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  type CameraProps,
} from "react-native-vision-camera";
import { io, type Socket } from "socket.io-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../api/api";
import { getAuth } from "@react-native-firebase/auth";
import type { ClaimGuardianLinkInput } from "@escronet/shared";
import type { SettingsStackParamList } from "../navigation/types";

const Camera = VisionCamera as unknown as React.ComponentType<CameraProps & { style?: object }>;
const QRCode = QRCodeSvg as unknown as React.ComponentType<{
  value: string; size?: number; backgroundColor?: string; color?: string;
}>;

const WS_URL = __DEV__ ? "http://10.0.2.2:3010" : "https://api.escronet.com";

const KEYS = {
  guardians:   ["guardians"]    as const,
  guardedUsers:["guardedUsers"] as const,
  links:       ["guardianLinks"] as const,
};

type Props = NativeStackScreenProps<SettingsStackParamList, "Guardian">;

type QrModal =
  | { visible: false }
  | { visible: true; qrUrl: string; code: string; expiresAt: string };

type ScanModal = { visible: boolean; code: string; userLabel: string; guardianLabel: string };

function extractCode(raw: string): string | null {
  try {
    const url = new URL(raw);
    const code = url.searchParams.get("code");
    if (code && /^[A-Z0-9]{6}$/i.test(code)) return code.toUpperCase();
  } catch {}
  const m = raw.match(/[?&]code=([A-Z0-9]{6})/i);
  return m ? m[1].toUpperCase() : null;
}

export function GuardianScreen({ route }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const deepLinkCode = route.params?.code ?? null;
  const queryClient = useQueryClient();

  const [qrModal, setQrModal] = useState<QrModal>({ visible: false });
  const [scanModal, setScanModal] = useState<ScanModal>({
    visible: false, code: "", userLabel: "", guardianLabel: "",
  });

  // ── TanStack Query ──────────────────────────────────────────────────────────
  // My Guardians and pending links are Android-only — call detection is required for alerts.
  const guardiansQ   = useQuery({ queryKey: KEYS.guardians,    queryFn: () => api.guardians.list(),         enabled: Platform.OS === "android" });
  const guardedUsersQ = useQuery({ queryKey: KEYS.guardedUsers, queryFn: () => api.guardians.listGuarding() });
  const linksQ       = useQuery({ queryKey: KEYS.links,        queryFn: () => api.guardianLinks.list(),     enabled: Platform.OS === "android" });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: KEYS.guardians });
    void queryClient.invalidateQueries({ queryKey: KEYS.guardedUsers });
    void queryClient.invalidateQueries({ queryKey: KEYS.links });
  };

  const generateMutation = useMutation({
    mutationFn: () => api.guardianLinks.generate(),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: KEYS.links });
      setQrModal({ visible: true, qrUrl: data.qrUrl, code: data.code, expiresAt: data.expiresAt });
    },
    onError: () => Alert.alert("Error", "Failed to generate QR code."),
  });

  const claimMutation = useMutation({
    mutationFn: (input: ClaimGuardianLinkInput) => api.guardianLinks.claim(input),
    onSuccess: () => {
      setScanModal({ visible: false, code: "", userLabel: "", guardianLabel: "" });
      Alert.alert("", t("guardian.successClaimed"));
      invalidateAll();
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("expired"))      Alert.alert("Error", t("guardian.errorExpired"));
      else if (msg.includes("already")) Alert.alert("Error", t("guardian.errorUsed"));
      else                              Alert.alert("Error", t("guardian.errorInvalid"));
    },
  });

  const removeLinkMutation = useMutation({
    mutationFn: (id: string) => api.guardianLinks.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEYS.links }),
  });

  const updateLabelMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => api.guardians.updateLabel(id, label),
    onSuccess: () => invalidateAll(),
    onError: () => Alert.alert("Error", "Failed to update label."),
  });

  const removeRelationMutation = useMutation({
    mutationFn: (id: string) => api.guardians.remove(id),
    onSuccess: () => invalidateAll(),
  });

  // ── WebSocket — persistent for screen lifetime ──────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const qrModalVisibleRef = useRef(false);
  qrModalVisibleRef.current = qrModal.visible;

  useEffect(() => {
    void (async () => {
      const token = await (getAuth().currentUser?.getIdToken() ?? null);
      if (!token) return;

      const socket = io(`${WS_URL}/guardian`, { auth: { token }, transports: ["websocket"] });

      socket.on("guardian-paired", () => {
        if (qrModalVisibleRef.current) {
          setQrModal({ visible: false });
          Alert.alert("", t("guardian.successPaired"));
        }
        invalidateAll();
      });

      socket.on("guardian-removed", () => {
        invalidateAll();
      });

      socketRef.current = socket;
    })();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Deep link pre-fill ──────────────────────────────────────────────────────
  useEffect(() => {
    if (deepLinkCode) {
      setScanModal({ visible: true, code: deepLinkCode, userLabel: "", guardianLabel: "" });
    }
  }, [deepLinkCode]);

  // ── Camera ──────────────────────────────────────────────────────────────────
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const scannedRef = useRef(false);
  const device = useCameraDevice("back");

  const codeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: (codes) => {
      if (scannedRef.current) return;
      const raw = codes[0]?.value;
      if (!raw) return;
      const code = extractCode(raw);
      if (!code) return;
      scannedRef.current = true;
      setCameraActive(false);
      setCameraOpen(false);
      setScanModal((s) => ({ ...s, visible: true, code }));
    },
  });

  const handleScan = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(t("guardian.cameraPermissionTitle"), t("guardian.cameraPermissionBody"));
        return;
      }
    }
    scannedRef.current = false;
    setCameraOpen(true);
  };

  const handleClaim = () => {
    const code = scanModal.code.trim().toUpperCase();
    const userLabel = scanModal.userLabel.trim();
    if (!code || code.length !== 6) { Alert.alert("Error", t("guardian.errorInvalid")); return; }
    if (!userLabel) { Alert.alert("Error", t("guardian.labelRequired")); return; }
    claimMutation.mutate({ code, userLabel, guardianLabel: scanModal.guardianLabel.trim() || undefined });
  };

  const handleUpdateLabel = (id: string, current: string | null) => {
    Alert.prompt(
      t("guardian.renameTitle"),
      t("guardian.renameBody"),
      [
        { text: t("guardian.cancel"), style: "cancel" },
        { text: t("guardian.save"), onPress: (label) => {
          if (label?.trim()) updateLabelMutation.mutate({ id, label: label.trim() });
        }},
      ],
      "plain-text",
      current ?? "",
    );
  };

  const handleRemoveGuardian = (id: string) => {
    Alert.alert(t("guardian.removeGuardianConfirm"), t("guardian.removeGuardianBody"), [
      { text: t("guardian.cancel"), style: "cancel" },
      { text: t("guardian.removeGuardian"), style: "destructive",
        onPress: () => removeRelationMutation.mutate(id) },
    ]);
  };

  const handleRemoveSelf = (id: string) => {
    Alert.alert(t("guardian.removeSelf"), t("guardian.removeSelfBody"), [
      { text: t("guardian.cancel"), style: "cancel" },
      { text: t("guardian.removeSelf"), style: "destructive",
        onPress: () => removeRelationMutation.mutate(id) },
    ]);
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const guardians    = guardiansQ.data?.guardians ?? [];
  const guardedUsers = guardedUsersQ.data?.guardedUsers ?? [];
  const allLinks     = linksQ.data?.links ?? [];
  const pendingLinks = allLinks.filter((l) => !l.usedAt && new Date(l.expiresAt) > new Date());
  const loading      = guardiansQ.isLoading || guardedUsersQ.isLoading || linksQ.isLoading;
  const loadError    = guardiansQ.error ?? guardedUsersQ.error ?? linksQ.error;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>{t("guardian.title")}</Text>

        {loadError && (
          <TouchableOpacity onPress={invalidateAll}>
            <Text style={styles.errorBanner}>
              ⚠ {loadError instanceof Error ? loadError.message : "Failed to load"}{"\n"}Tap to retry
            </Text>
          </TouchableOpacity>
        )}

        {/* ── My Guardians (Android only — requires call detection) ── */}
        {Platform.OS === "android" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("guardian.myGuardians")}</Text>
            {loading ? <ActivityIndicator color="#4FC3F7" style={styles.loader} /> : (
              <>
                {guardians.length === 0 && pendingLinks.length === 0 && (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>{t("guardian.noGuardians")}</Text>
                    <Text style={styles.emptyBody}>{t("guardian.noGuardiansSub")}</Text>
                  </View>
                )}
                {guardians.map((g) => (
                  <View key={g.id} style={styles.row}>
                    <TouchableOpacity style={styles.rowInfo} onPress={() => handleUpdateLabel(g.id, g.userLabel)}>
                      <Text style={styles.rowName}>{g.userLabel ?? t("guardian.unnamed")}</Text>
                      <Text style={styles.rowSub}>{t("guardian.tapToRename")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveGuardian(g.id)}>
                      <Text style={styles.removeBtnText}>{t("guardian.removeGuardian")}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {pendingLinks.map((l) => (
                  <View key={l.id} style={[styles.row, styles.pendingRow]}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.pendingCode}>{l.code}</Text>
                      <Text style={styles.rowSub}>{t("guardian.pendingLink")}</Text>
                    </View>
                    <TouchableOpacity style={styles.removeBtn}
                      onPress={() => removeLinkMutation.mutate(l.id)}
                      disabled={removeLinkMutation.isPending}>
                      <Text style={styles.removeBtnText}>{t("guardian.cancel")}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
            <TouchableOpacity
              style={[styles.primaryBtn, generateMutation.isPending && styles.disabledBtn]}
              onPress={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}>
              {generateMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>+ {t("guardian.addGuardian")}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── I Am a Guardian ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("guardian.iAmGuardian")}</Text>
          {loading ? <ActivityIndicator color="#4FC3F7" style={styles.loader} /> : (
            <>
              {guardedUsers.length === 0 && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>{t("guardian.noGuarding")}</Text>
                  <Text style={styles.emptyBody}>{t("guardian.noGuardingSub")}</Text>
                </View>
              )}
              {guardedUsers.map((u) => (
                <View key={u.id} style={styles.row}>
                  <TouchableOpacity style={styles.rowInfo} onPress={() => handleUpdateLabel(u.id, u.guardianLabel)}>
                    <Text style={styles.rowName}>{u.guardianLabel ?? t("guardian.unnamed")}</Text>
                    <Text style={styles.rowSub}>{t("guardian.tapToRename")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveSelf(u.id)}>
                    <Text style={styles.removeBtnText}>{t("guardian.removeSelf")}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleScan}>
            <Text style={styles.secondaryBtnText}>📷 {t("guardian.scanQr")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── QR Display Modal ── */}
      <Modal visible={qrModal.visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("guardian.qrModalTitle")}</Text>
            <Text style={styles.modalBody}>{t("guardian.qrModalBody")}</Text>
            {qrModal.visible && (
              <>
                <View style={styles.qrWrapper}>
                  <QRCode value={qrModal.qrUrl} size={220} backgroundColor="#fff" color="#0D1B2A" />
                </View>
                <Text style={styles.codeLabel}>{qrModal.code}</Text>
              </>
            )}
            <Text style={styles.expiryLabel}>⏳ {t("guardian.qrExpires")}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setQrModal({ visible: false })}>
              <Text style={styles.primaryBtnText}>{t("guardian.close")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Camera Scanner ── */}
      <Modal
        visible={cameraOpen}
        animationType="slide"
        onShow={() => setCameraActive(true)}
        onDismiss={() => setCameraActive(false)}
        onRequestClose={() => { setCameraActive(false); setCameraOpen(false); }}
      >
        <View style={styles.cameraContainer}>
          {device
            ? <Camera style={StyleSheet.absoluteFill} device={device} isActive={cameraActive} codeScanner={codeScanner} />
            : <ActivityIndicator color="#4FC3F7" size="large" />}
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>{t("guardian.scanHint")}</Text>
          </View>
          <TouchableOpacity style={styles.cameraClose} onPress={() => setCameraOpen(false)}>
            <Text style={styles.cameraCloseTxt}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Claim Modal ── */}
      <Modal visible={scanModal.visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("guardian.claimTitle")}</Text>

            <Text style={styles.inputLabel}>{t("guardian.codeLabel")}</Text>
            <TextInput
              style={styles.input}
              value={scanModal.code}
              onChangeText={(v) => setScanModal((s) => ({ ...s, code: v.toUpperCase() }))}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              placeholder="AB3X9K"
              placeholderTextColor="#546E7A"
            />

            <Text style={styles.inputLabel}>{t("guardian.yourNameLabel")}</Text>
            <TextInput
              style={styles.input}
              value={scanModal.userLabel}
              onChangeText={(v) => setScanModal((s) => ({ ...s, userLabel: v }))}
              placeholder={t("guardian.yourNamePlaceholder")}
              placeholderTextColor="#546E7A"
            />

            <Text style={styles.inputLabel}>{t("guardian.theirNameLabel")}</Text>
            <TextInput
              style={styles.input}
              value={scanModal.guardianLabel}
              onChangeText={(v) => setScanModal((s) => ({ ...s, guardianLabel: v }))}
              placeholder={t("guardian.theirNamePlaceholder")}
              placeholderTextColor="#546E7A"
            />

            <View style={styles.rowBtns}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setScanModal({ visible: false, code: "", userLabel: "", guardianLabel: "" })}
                disabled={claimMutation.isPending}
              >
                <Text style={styles.secondaryBtnText}>{t("guardian.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.flex1, claimMutation.isPending && styles.disabledBtn]}
                onPress={handleClaim}
                disabled={claimMutation.isPending}
              >
                {claimMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>{t("guardian.confirmScan")}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0D1B2A" },
  container: { padding: 24, gap: 24, paddingBottom: 40 },
  header: { color: "#FFFFFF", fontSize: 28, fontWeight: "700" },
  errorBanner: { color: "#EF5350", fontSize: 13, backgroundColor: "#1A0A0A", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#EF5350", lineHeight: 20 },
  section: { gap: 12 },
  sectionTitle: { color: "#4FC3F7", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  loader: { marginVertical: 16 },
  emptyCard: { backgroundColor: "#0F2A40", borderRadius: 14, padding: 20, borderWidth: 1, borderColor: "#1E3A5F", gap: 6 },
  emptyTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  emptyBody: { color: "#90A4AE", fontSize: 13, lineHeight: 20 },
  row: { backgroundColor: "#0F2A40", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#1E3A5F" },
  pendingRow: { borderStyle: "dashed", borderColor: "#37474F" },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  rowSub: { color: "#546E7A", fontSize: 11 },
  pendingCode: { color: "#4FC3F7", fontSize: 18, fontWeight: "700", letterSpacing: 3 },
  removeBtn: { backgroundColor: "#1A2E40", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#EF5350" },
  removeBtnText: { color: "#EF5350", fontSize: 12, fontWeight: "600" },
  primaryBtn: { backgroundColor: "#1565C0", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryBtn: { backgroundColor: "#0F2A40", borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#1E3A5F" },
  secondaryBtnText: { color: "#4FC3F7", fontSize: 15, fontWeight: "600" },
  disabledBtn: { opacity: 0.6 },
  flex1: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { backgroundColor: "#0F2A40", borderRadius: 20, padding: 24, width: "100%", gap: 14, borderWidth: 1, borderColor: "#1E3A5F" },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", textAlign: "center" },
  modalBody: { color: "#90A4AE", fontSize: 14, textAlign: "center", lineHeight: 22 },
  qrWrapper: { alignItems: "center", padding: 16, backgroundColor: "#fff", borderRadius: 16 },
  codeLabel: { color: "#4FC3F7", fontSize: 28, fontWeight: "700", letterSpacing: 6, textAlign: "center" },
  expiryLabel: { color: "#90A4AE", fontSize: 13, textAlign: "center" },
  inputLabel: { color: "#90A4AE", fontSize: 13, fontWeight: "600" },
  input: { backgroundColor: "#0D1B2A", borderRadius: 10, borderWidth: 1, borderColor: "#1E3A5F", color: "#FFFFFF", paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  rowBtns: { flexDirection: "row", gap: 10 },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", gap: 24 },
  scanFrame: { width: 220, height: 220, borderWidth: 2, borderColor: "#4FC3F7", borderRadius: 16, backgroundColor: "transparent" },
  scanHint: { color: "#FFFFFF", fontSize: 14, textAlign: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  cameraClose: { position: "absolute", top: 48, right: 24, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  cameraCloseTxt: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
});
