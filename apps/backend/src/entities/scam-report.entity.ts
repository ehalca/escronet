import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "scam_reports" })
export class ScamReportEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "phone_hash", type: "varchar", length: 64 })
  phoneHash!: string;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "varchar", length: 64, default: "community" })
  source!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
