import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "scam_alerts" })
export class AlertEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "owner_user_id", type: "varchar", length: 128 })
  ownerUserId!: string;

  @Column({ name: "call_id", type: "varchar", length: 128 })
  callId!: string;

  @Column({ type: "float" })
  score!: number;

  @Column({ name: "transcript_preview", type: "text", nullable: true })
  transcriptPreview?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
