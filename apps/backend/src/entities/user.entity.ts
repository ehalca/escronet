import { Column, Entity, OneToMany } from "typeorm";
import { Guardian } from "./guardian.entity";
import { BaseEntity } from "./base-entity";

@Entity("users")
export class User extends BaseEntity {
  @Column({ name: "device_id", type: "varchar", length: 128, unique: true, nullable: true })
  deviceId!: string | null;

  @Column({ name: "fcm_token", type: "text", nullable: true })
  fcmToken!: string | null;

  @OneToMany(() => Guardian, (guardian) => guardian.user)
  guardians!: Guardian[];
}
