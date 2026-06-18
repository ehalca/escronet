import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { ScamType } from "@escronet/shared";
import { BaseEntity } from "./base-entity";
import { Alert } from "./alert.entity";
import { User } from "./user.entity";

@Entity("reports")
@Unique(["alertId", "reporterId"])
export class Report extends BaseEntity {
  @Column({ name: "alert_id", type: "uuid" })
  alertId!: string;

  @ManyToOne(() => Alert, (alert) => alert.reports, { onDelete: "CASCADE" })
  @JoinColumn({ name: "alert_id" })
  alert!: Alert;

  @Column({ name: "reporter_id", type: "uuid" })
  reporterId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reporter_id" })
  reporter!: User;

  @Column({ name: "type", type: "enum", enum: ScamType })
  type!: ScamType;
}
