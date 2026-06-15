import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base-entity";
import { Alert } from "./alert.entity";
import { User } from "./user.entity";

@Entity("alert_notifications")
export class AlertNotification extends BaseEntity {
  @Column({ name: "alert_id", type: "uuid" })
  alertId!: string;

  @ManyToOne(() => Alert, (alert) => alert.notifications, { onDelete: "CASCADE" })
  @JoinColumn({ name: "alert_id" })
  alert!: Alert;

  @Column({ name: "guardian_user_id", type: "uuid" })
  guardianUserId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "guardian_user_id" })
  guardianUser!: User;

  /** Snapshot of the FCM token used at dispatch time */
  @Column({ name: "fcm_token_snapshot", type: "text", nullable: true })
  fcmTokenSnapshot!: string | null;

  @Column({ name: "delivered", type: "boolean", default: false })
  delivered!: boolean;

  @Column({ name: "delivered_at", type: "timestamptz", nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: "seen", type: "boolean", default: false })
  seen!: boolean;

  @Column({ name: "seen_at", type: "timestamptz", nullable: true })
  seenAt!: Date | null;
}
