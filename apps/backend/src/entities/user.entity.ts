import { Column, Entity, OneToMany } from "typeorm";
import { GuardianRelation } from "./guardian-relation.entity";
import { GuardianLink } from "./guardian-link.entity";
import { BaseEntity } from "./base-entity";

@Entity("users")
export class User extends BaseEntity {
  @Column({ name: "device_id", type: "varchar", length: 128, unique: true, nullable: true })
  deviceId!: string | null;

  @Column({ name: "fcm_token", type: "text", nullable: true })
  fcmToken!: string | null;

  @OneToMany(() => GuardianRelation, (rel) => rel.user)
  guardians!: GuardianRelation[];

  @OneToMany(() => GuardianRelation, (rel) => rel.guardianUser)
  asGuardianOf!: GuardianRelation[];

  @OneToMany(() => GuardianLink, (link) => link.user)
  guardianLinks!: GuardianLink[];
}
