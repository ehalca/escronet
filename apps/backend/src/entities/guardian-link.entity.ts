import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base-entity";
import { GuardianRelation } from "./guardian-relation.entity";
import { User } from "./user.entity";

@Entity("guardian_links")
export class GuardianLink extends BaseEntity {
  /** Short 6-char alphanumeric code shown in QR (e.g. "AB3X9K") */
  @Column({ name: "code", type: "varchar", length: 8, unique: true })
  code!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "used_at", type: "timestamptz", nullable: true })
  usedAt!: Date | null;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (user) => user.guardianLinks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "relation_id", type: "uuid", nullable: true })
  relationId!: string | null;

  @ManyToOne(() => GuardianRelation, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "relation_id" })
  relation!: GuardianRelation | null;
}
