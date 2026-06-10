import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "./base-entity";
import { User } from "./user.entity";

@Entity("guardian_relations")
@Unique(["userId", "guardianUserId"])
export class GuardianRelation extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (user) => user.guardians, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "guardian_user_id", type: "uuid" })
  guardianUserId!: string;

  @ManyToOne(() => User, (user) => user.asGuardianOf, { onDelete: "CASCADE" })
  @JoinColumn({ name: "guardian_user_id" })
  guardianUser!: User;

  /** Label the protected USER gives to this guardian ("Mom", "Dad") */
  @Column({ name: "user_label", type: "varchar", length: 100, nullable: true })
  userLabel!: string | null;

  /** Label the GUARDIAN gives to the user they protect ("My son John") */
  @Column({ name: "guardian_label", type: "varchar", length: 100, nullable: true })
  guardianLabel!: string | null;
}
