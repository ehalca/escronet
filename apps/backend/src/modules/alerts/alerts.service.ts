import { Injectable, Logger, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Alert } from "../../entities/alert.entity";
import { AlertNotification } from "../../entities/alert-notification.entity";
import { GuardianRelation } from "../../entities/guardian-relation.entity";
import { User } from "../../entities/user.entity";
import { GuardianEventsGateway } from "../../gateway/guardian-events.gateway";
import { FirebaseMessagingService } from "../firebase/firebase-messaging.service";
import type {
  CreateAlertInput,
  CreateAlertResponse,
  AlertRecord,
  AlertNotificationRecord,
  ListMyAlertsResponse,
  ListAlertNotificationsResponse,
} from "@escronet/shared";

const INITIAL_RETRY_MS = 30_000;
const MIN_RETRY_MS = 10_000;
const RETRY_DECAY = 0.7;

@Injectable()
export class AlertsService implements OnModuleDestroy {
  private readonly logger = new Logger(AlertsService.name);

  // notificationId → active retry timer
  private readonly retryTimers = new Map<string, NodeJS.Timeout>();
  // alertId → Set of notificationIds (for bulk cancel on "hung")
  private readonly alertRetryIndex = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(AlertNotification)
    private readonly notificationRepo: Repository<AlertNotification>,
    @InjectRepository(GuardianRelation)
    private readonly relationRepo: Repository<GuardianRelation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly messaging: FirebaseMessagingService,
    private readonly gateway: GuardianEventsGateway,
  ) {}

  onModuleDestroy() {
    for (const timer of this.retryTimers.values()) clearTimeout(timer);
    this.retryTimers.clear();
    this.alertRetryIndex.clear();
  }

  async createAlert(userId: string, input: CreateAlertInput): Promise<CreateAlertResponse> {
    this.logger.log(
      `[createAlert] user=${userId} callerHash=${input.callerHash} riskLevel=${input.riskLevel} duration=${input.callDuration ?? "?"} detectedAt=${input.detectedAt}`,
    );

    const alert = this.alertRepo.create({
      userId,
      callerHash: input.callerHash,
      riskLevel: input.riskLevel,
      score: input.score ?? null,
      transcriptSnippet: input.transcriptSnippet ?? null,
      category: input.category ?? null,
      callDuration: input.callDuration ?? null,
      callStartedAt: input.callStartedAt ? new Date(input.callStartedAt) : null,
      detectedAt: new Date(input.detectedAt),
      status: "active",
    });
    await this.alertRepo.save(alert);
    this.logger.log(`[createAlert] alert saved id=${alert.id}`);

    const relations = await this.relationRepo.find({ where: { userId } });
    this.logger.log(`[createAlert] guardian relations found: ${relations.length}`);

    if (relations.length === 0) {
      this.logger.warn(`[createAlert] user=${userId} has no guardians — no push sent`);
      return { alertId: alert.id, notificationsDispatched: 0 };
    }

    const guardianIds = relations.map((r) => r.guardianUserId);
    const labelByGuardian = new Map<string, string>(
      relations.map((r) => [r.guardianUserId, r.guardianLabel ?? ""]),
    );
    const guardians = await this.userRepo.findBy({ id: In(guardianIds) });
    this.logger.log(
      `[createAlert] loaded ${guardians.length} guardian(s): ` +
        guardians
          .map((g) => `${g.id}(fcm=${g.fcmToken ? g.fcmToken.slice(0, 12) + "…" : "null"})`)
          .join(", "),
    );

    let dispatched = 0;
    const retryEntries: Array<{ notificationId: string; guardianId: string; guardianLabel: string }> = [];

    await Promise.all(
      guardians.map(async (guardian) => {
        const notification = this.notificationRepo.create({
          alertId: alert.id,
          guardianUserId: guardian.id,
          fcmTokenSnapshot: guardian.fcmToken,
          delivered: false,
          deliveredAt: null,
          seen: false,
          seenAt: null,
        });
        await this.notificationRepo.save(notification);

        if (!guardian.fcmToken) {
          this.logger.warn(`[createAlert] guardian=${guardian.id} has no fcmToken — skipping push`);
          retryEntries.push({ notificationId: notification.id, guardianId: guardian.id, guardianLabel: labelByGuardian.get(guardian.id) ?? "" });
          return;
        }

        try {
          await this.messaging.sendToDevice(guardian.fcmToken, {
            data: {
              type: "alert_created",
              alertId: alert.id,
              notificationId: notification.id,
              riskLevel: String(alert.riskLevel),
              protectedUserLabel: labelByGuardian.get(guardian.id) ?? "",
            },
          });
          notification.delivered = true;
          notification.deliveredAt = new Date();
          await this.notificationRepo.save(notification);
          dispatched++;
          this.logger.log(`[createAlert] push delivered to guardian=${guardian.id}`);
        } catch (err) {
          this.logger.warn(`[createAlert] FCM failed for guardian=${guardian.id}: ${String(err)}`);
        }

        retryEntries.push({ notificationId: notification.id, guardianId: guardian.id, guardianLabel: labelByGuardian.get(guardian.id) ?? "" });
      }),
    );

    if (retryEntries.length > 0) {
      this.startRetryLoop(alert.id, retryEntries);
    }

    this.logger.log(`[createAlert] done — alertId=${alert.id} dispatched=${dispatched}/${guardians.length}`);
    return { alertId: alert.id, notificationsDispatched: dispatched };
  }

  // ── Retry loop ──────────────────────────────────────────────────────────────

  private startRetryLoop(
    alertId: string,
    entries: Array<{ notificationId: string; guardianId: string; guardianLabel: string }>,
  ): void {
    const ids = new Set(entries.map((e) => e.notificationId));
    this.alertRetryIndex.set(alertId, ids);
    for (const { notificationId, guardianId, guardianLabel } of entries) {
      this.scheduleRetry(alertId, notificationId, guardianId, guardianLabel, INITIAL_RETRY_MS);
    }
    this.logger.log(`[retry] loop started alertId=${alertId} guardians=${entries.length} initialInterval=${INITIAL_RETRY_MS}ms`);
  }

  private scheduleRetry(
    alertId: string,
    notificationId: string,
    guardianId: string,
    guardianLabel: string,
    intervalMs: number,
  ): void {
    const timer = setTimeout(() => {
      void this.executeRetry(alertId, notificationId, guardianId, guardianLabel, intervalMs);
    }, intervalMs);
    this.retryTimers.set(notificationId, timer);
  }

  private async executeRetry(
    alertId: string,
    notificationId: string,
    guardianId: string,
    guardianLabel: string,
    currentInterval: number,
  ): Promise<void> {
    this.retryTimers.delete(notificationId);

    const alert = await this.alertRepo.findOneBy({ id: alertId });
    if (!alert || alert.status === "hung") {
      this.logger.log(`[retry] alertId=${alertId} is hung or gone — stopping all retries`);
      this.cancelAllRetries(alertId);
      return;
    }

    const notif = await this.notificationRepo.findOneBy({ id: notificationId });
    if (!notif || notif.seen) {
      this.logger.log(`[retry] notif=${notificationId} already seen — stopping`);
      this.removeFromIndex(alertId, notificationId);
      return;
    }

    const guardian = await this.userRepo.findOneBy({ id: guardianId });
    if (guardian?.fcmToken) {
      try {
        await this.messaging.sendToDevice(guardian.fcmToken, {
          data: {
            type: "alert_retry",
            alertId,
            notificationId,
            riskLevel: String(alert.riskLevel),
            protectedUserLabel: guardianLabel,
          },
        });
        this.logger.log(`[retry] push sent to guardian=${guardianId} interval=${currentInterval}ms`);
      } catch (err) {
        this.logger.warn(`[retry] FCM failed guardian=${guardianId}: ${String(err)}`);
      }
    }

    const nextInterval = Math.max(MIN_RETRY_MS, Math.round(currentInterval * RETRY_DECAY));
    this.scheduleRetry(alertId, notificationId, guardianId, guardianLabel, nextInterval);
    this.logger.log(`[retry] next retry for notif=${notificationId} in ${nextInterval}ms`);
  }

  private cancelAllRetries(alertId: string): void {
    const ids = this.alertRetryIndex.get(alertId);
    if (!ids) return;
    for (const nid of ids) {
      const timer = this.retryTimers.get(nid);
      if (timer) {
        clearTimeout(timer);
        this.retryTimers.delete(nid);
      }
    }
    this.alertRetryIndex.delete(alertId);
    this.logger.log(`[retry] cancelled all retries for alertId=${alertId}`);
  }

  private removeFromIndex(alertId: string, notificationId: string): void {
    const ids = this.alertRetryIndex.get(alertId);
    if (ids) {
      ids.delete(notificationId);
      if (ids.size === 0) this.alertRetryIndex.delete(alertId);
    }
    const timer = this.retryTimers.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(notificationId);
    }
  }

  // ── Risk update ─────────────────────────────────────────────────────────────

  async updateAlertRisk(alertId: string, userId: string, riskLevel: string): Promise<void> {
    const alert = await this.alertRepo.findOneBy({ id: alertId, userId });
    if (!alert) throw new NotFoundException("Alert not found");
    alert.riskLevel = riskLevel as Alert["riskLevel"];
    await this.alertRepo.save(alert);
    this.logger.log(`[updateAlertRisk] alertId=${alertId} riskLevel=${riskLevel}`);

    const notifications = await this.notificationRepo.findBy({ alertId });
    if (notifications.length === 0) return;

    const guardianIds = notifications.map((n) => n.guardianUserId);
    const guardians = await this.userRepo.findBy({ id: In(guardianIds) });

    const relations = await this.relationRepo.find({ where: { userId, guardianUserId: In(guardianIds) } });
    const labelByGuardian = new Map<string, string>(relations.map((r) => [r.guardianUserId, r.guardianLabel ?? ""]));

    await Promise.all(
      guardians.map(async (guardian) => {
        if (!guardian.fcmToken) return;
        try {
          await this.messaging.sendToDevice(guardian.fcmToken, {
            data: {
              type: "risk_escalated",
              alertId,
              riskLevel,
              protectedUserLabel: labelByGuardian.get(guardian.id) ?? "",
            },
          });
        } catch (err) {
          this.logger.warn(`[updateAlertRisk] FCM failed for guardian=${guardian.id}: ${String(err)}`);
        }
      }),
    );

    this.gateway.notifyAlertRiskChanged(guardianIds, alertId, riskLevel);
    this.logger.log(`[updateAlertRisk] WS + FCM notified ${guardianIds.length} guardian(s)`);
  }

  // ── Status update ───────────────────────────────────────────────────────────

  async updateAlertStatus(alertId: string, userId: string, status: string): Promise<void> {
    const alert = await this.alertRepo.findOneBy({ id: alertId, userId });
    if (!alert) throw new NotFoundException("Alert not found");
    alert.status = status;
    if (status === "hung") alert.hungAt = new Date();
    await this.alertRepo.save(alert);
    this.logger.log(`[updateAlertStatus] alertId=${alertId} status=${status}`);
    if (status === "hung") {
      this.cancelAllRetries(alertId);
      const notifications = await this.notificationRepo.findBy({ alertId });
      const guardianIds = notifications.map((n) => n.guardianUserId);
      if (guardianIds.length > 0) {
        this.gateway.notifyAlertStatusChanged(guardianIds, alertId, status);
        this.logger.log(`[updateAlertStatus] WS notified ${guardianIds.length} guardian(s) alert=${alertId} status=hung`);
      }
    }
  }

  // ── Existing read methods ───────────────────────────────────────────────────

  async listMyAlerts(userId: string): Promise<ListMyAlertsResponse> {
    const alerts = await this.alertRepo.find({ where: { userId }, order: { detectedAt: "DESC" } });
    return { alerts: alerts.map((a) => this.toAlertRecord(a)) };
  }

  async listGuardianNotifications(guardianUserId: string): Promise<ListAlertNotificationsResponse> {
    const notifications = await this.notificationRepo.find({
      where: { guardianUserId },
      relations: { alert: true },
      order: { createdAt: "DESC" },
    });

    if (notifications.length === 0) return { notifications: [] };

    const protectedUserIds = [...new Set(notifications.map((n) => n.alert.userId))];
    const relations = await this.relationRepo.find({
      where: { guardianUserId, userId: In(protectedUserIds) },
    });
    const labelMap = new Map<string, string | null>(
      relations.map((r) => [r.userId, r.guardianLabel]),
    );

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        alertId: n.alertId,
        guardianUserId: n.guardianUserId,
        delivered: n.delivered,
        deliveredAt: n.deliveredAt?.toISOString() ?? null,
        seen: n.seen,
        seenAt: n.seenAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
        alert: {
          riskLevel: n.alert.riskLevel,
          callerHash: n.alert.callerHash,
          callDuration: n.alert.callDuration,
          callStartedAt: n.alert.callStartedAt?.toISOString() ?? null,
          detectedAt: n.alert.detectedAt.toISOString(),
          transcriptSnippet: n.alert.transcriptSnippet,
          category: n.alert.category,
          score: n.alert.score,
          status: (n.alert.status ?? "active") as "active" | "hung",
          hungAt: n.alert.hungAt?.toISOString() ?? null,
        },
        protectedUserId: n.alert.userId,
        protectedUserLabel: labelMap.get(n.alert.userId) ?? null,
      })),
    };
  }

  async markSeen(notificationId: string, guardianUserId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, guardianUserId },
    });
    if (!notification) throw new NotFoundException("Notification not found");
    if (notification.seen) return;
    notification.seen = true;
    notification.seenAt = new Date();
    await this.notificationRepo.save(notification);
    this.logger.log(`[markSeen] notification=${notificationId} marked seen by guardian=${guardianUserId}`);
    // Retry loop will self-terminate on next tick when it reads seen=true
  }

  private toAlertRecord(a: Alert): AlertRecord {
    return {
      id: a.id,
      userId: a.userId,
      callerHash: a.callerHash,
      riskLevel: a.riskLevel,
      score: a.score,
      transcriptSnippet: a.transcriptSnippet,
      category: a.category,
      callDuration: a.callDuration,
      callStartedAt: a.callStartedAt?.toISOString() ?? null,
      detectedAt: a.detectedAt.toISOString(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      status: (a.status ?? "active") as "active" | "hung",
      hungAt: a.hungAt?.toISOString() ?? null,
    };
  }
}
