import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { RiskLevel } from "@escronet/shared";
import { BaseEntity } from "./base-entity";
import { User } from "./user.entity";
import { AlertNotification } from "./alert-notification.entity";
import { Report } from "./report.entity";

@Entity("alerts")
export class Alert extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (user) => user.alerts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "caller_hash", type: "varchar", length: 128 })
  callerHash!: string;

  @Column({ name: "risk_level", type: "varchar", length: 20 })
  riskLevel!: RiskLevel;

  @Column({ name: "score", type: "float", nullable: true })
  score!: number | null;

  @Column({ name: "transcript_snippet", type: "text", nullable: true })
  transcriptSnippet!: string | null;

  @Column({ name: "category", type: "varchar", length: 64, nullable: true })
  category!: string | null;

  @Column({ name: "call_duration", type: "integer", nullable: true })
  callDuration!: number | null;

  @Column({ name: "call_started_at", type: "timestamptz", nullable: true })
  callStartedAt!: Date | null;

  @Column({ name: "detected_at", type: "timestamptz" })
  detectedAt!: Date;

  @Column({ name: "status", type: "varchar", length: 16, default: "active" })
  status!: string;

  @Column({ name: "hung_at", type: "timestamptz", nullable: true })
  hungAt!: Date | null;

  @OneToMany(() => AlertNotification, (n) => n.alert)
  notifications!: AlertNotification[];

  @OneToMany(() => Report, (r) => r.alert)
  reports!: Report[];
}
