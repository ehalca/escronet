import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Alert } from "../../entities/alert.entity";
import { GuardianLink } from "../../entities/guardian-link.entity";
import { GuardianRelation } from "../../entities/guardian-relation.entity";
import { User } from "../../entities/user.entity";
import { FirebaseModule } from "../firebase/firebase.module";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, GuardianRelation, GuardianLink, Alert]),
    FirebaseModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
