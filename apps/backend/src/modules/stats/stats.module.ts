import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Alert } from "../../entities/alert.entity";
import { Caller } from "../../entities/caller.entity";
import { GuardianRelation } from "../../entities/guardian-relation.entity";
import { User } from "../../entities/user.entity";
import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, Alert, Caller, GuardianRelation])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
