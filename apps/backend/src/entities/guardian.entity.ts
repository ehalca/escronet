import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base-entity";
import { User } from "./user.entity";

@Entity("guardians")
export class Guardian extends BaseEntity {
  @Column({ name: "name", type: "varchar" })
  name!: string;

  guardingUserId!: string;

  @ManyToOne(() => User, (user) => user.guardians, { onDelete: "CASCADE" })
  @JoinColumn({ name: "guarding_user_id" })
  user!: User;
}
