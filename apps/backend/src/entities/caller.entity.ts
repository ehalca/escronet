import { Column, DeleteDateColumn, Entity } from "typeorm";
import { BaseEntity } from "./base-entity";
import { RiskLevel } from "@escronet/shared";

@Entity("callers")
export class Caller extends BaseEntity {
  @Column({ name: "phone_number", type: "varchar", unique: true })
  phoneNumber!: string;

  @Column({ name: "risk_level", type: "enum", enum: RiskLevel })
  riskLevel!: RiskLevel;

  @DeleteDateColumn()
  deleteAt!: Date;
}
