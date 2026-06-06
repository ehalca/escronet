import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity({ name: "scam_numbers" })
@Index("idx_scam_numbers_updated_at", ["updatedAt"])
export class ScamNumberEntity {
  @PrimaryColumn({ name: "phone_hash", type: "varchar", length: 64 })
  phoneHash!: string;

  @Column({ type: "int" })
  confidence!: number;

  @Column({ name: "report_count", type: "int", default: 0 })
  reportCount!: number;

  @Column({ type: "varchar", length: 64 })
  source!: string;

  @Column({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
