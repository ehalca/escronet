import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "designated_contacts" })
export class DesignatedContactEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "owner_user_id", type: "varchar", length: 128 })
  ownerUserId!: string;

  @Column({ name: "contact_phone_hash", type: "varchar", length: 64 })
  contactPhoneHash!: string;

  @Column({ name: "fcm_token", type: "text" })
  fcmToken!: string;

  @Column({ name: "display_name", type: "varchar", length: 120 })
  displayName!: string;
}
