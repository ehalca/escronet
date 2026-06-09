import { Entity, OneToMany } from "typeorm";
import { Guardian } from "./guardian.entity";
import { BaseEntity } from "./base-entity";

@Entity("users")
export class User extends BaseEntity {
  @OneToMany(() => Guardian, (guardian) => guardian.user)
  guardians!: Guardian[];
}
