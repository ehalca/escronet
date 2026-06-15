import { DeviceEventEmitter } from "react-native";
import { RiskLevel } from "@escronet/shared";
import type { CreateAlertInput } from "@escronet/shared";
import { getAuth } from "@react-native-firebase/auth";
import { api } from "../api/api";

const CALL_THRESHOLD_EVENT = "call_threshold_reached";
const CALL_ENDED_EVENT = "call_ended";
const RISK_ESCALATED_EVENT = "risk_escalated";
export const ALERT_LIST_CHANGED_EVENT = "escronet:alert_list_changed";

interface CallThresholdPayload {
  callerHash: string;
  callDuration: number;
  detectedAt: string;
  callStartedAt: string;
}

interface RiskEscalatedPayload {
  riskLevel: string;
  callerHash: string;
  callStartedAt: string;
  detectedAt: string;
}

// alertId of the current active call, set when the backend confirms creation
let activeAlertId: string | null = null;

export function startCallEventListener(): () => void {
  const onThreshold = DeviceEventEmitter.addListener(
    CALL_THRESHOLD_EVENT,
    async (payload: CallThresholdPayload) => {
      if (!getAuth().currentUser) return;
      // Alert may have already been created by a risk escalation event before 30s
      if (activeAlertId) return;

      const input: CreateAlertInput = {
        callerHash: payload.callerHash,
        riskLevel: RiskLevel.LOW,
        callDuration: payload.callDuration,
        detectedAt: payload.detectedAt,
        callStartedAt: payload.callStartedAt,
      };

      try {
        const response = await api.alerts.create(input);
        activeAlertId = response.alertId;
        DeviceEventEmitter.emit(ALERT_LIST_CHANGED_EVENT);
      } catch {
        // fire-and-forget — backend delivery does not block call handling
      }
    },
  );

  const onRiskEscalated = DeviceEventEmitter.addListener(
    RISK_ESCALATED_EVENT,
    async (payload: RiskEscalatedPayload) => {
      if (!getAuth().currentUser) return;
      const riskLevel = payload.riskLevel as RiskLevel;

      if (activeAlertId) {
        // Alert already exists — escalate its risk level immediately
        try {
          await api.alerts.updateRisk(activeAlertId, { riskLevel });
          DeviceEventEmitter.emit(ALERT_LIST_CHANGED_EVENT);
        } catch { /* best-effort */ }
      } else {
        // OTP arrived before 30s threshold — create alert immediately, don't wait
        try {
          const response = await api.alerts.create({
            callerHash: payload.callerHash,
            riskLevel,
            callStartedAt: payload.callStartedAt,
            detectedAt: payload.detectedAt,
          });
          activeAlertId = response.alertId;
          DeviceEventEmitter.emit(ALERT_LIST_CHANGED_EVENT);
        } catch { /* best-effort */ }
      }
    },
  );

  const onCallEnded = DeviceEventEmitter.addListener(CALL_ENDED_EVENT, async () => {
    const alertId = activeAlertId;
    activeAlertId = null;
    if (!alertId || !getAuth().currentUser) return;

    try {
      await api.alerts.updateStatus(alertId, { status: "hung" });
      DeviceEventEmitter.emit(ALERT_LIST_CHANGED_EVENT);
    } catch {
      // best-effort — server retry loop will eventually time out or guardian reads
    }
  });

  return () => {
    onThreshold.remove();
    onRiskEscalated.remove();
    onCallEnded.remove();
  };
}
