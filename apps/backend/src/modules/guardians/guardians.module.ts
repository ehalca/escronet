import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GuardianRelation } from "../../entities/guardian-relation.entity";
import { GuardianEventsModule } from "../../gateway/guardian-events.module";
import { GuardiansService } from "./guardians.service";
import { GuardiansController } from "./guardians.controller";

@Module({
  imports: [TypeOrmModule.forFeature([GuardianRelation]), GuardianEventsModule],
  controllers: [GuardiansController],
  providers: [GuardiansService],
  exports: [GuardiansService],
})
export class GuardiansModule {}
