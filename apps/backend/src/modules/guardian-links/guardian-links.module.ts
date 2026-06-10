import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GuardianLink } from "../../entities/guardian-link.entity";
import { GuardianRelation } from "../../entities/guardian-relation.entity";
import { GuardianEventsModule } from "../../gateway/guardian-events.module";
import { GuardianLinksService } from "./guardian-links.service";
import { GuardianLinksController } from "./guardian-links.controller";

@Module({
  imports: [TypeOrmModule.forFeature([GuardianLink, GuardianRelation]), GuardianEventsModule],
  controllers: [GuardianLinksController],
  providers: [GuardianLinksService],
  exports: [GuardianLinksService],
})
export class GuardianLinksModule {}
