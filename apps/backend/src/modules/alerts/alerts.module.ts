import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Alert } from "../../entities/alert.entity";
import { AlertNotification } from "../../entities/alert-notification.entity";
import { GuardianRelation } from "../../entities/guardian-relation.entity";
import { User } from "../../entities/user.entity";
import { GuardianEventsModule } from "../../gateway/guardian-events.module";
import { AlertsService } from "./alerts.service";
import { AlertsController } from "./alerts.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, AlertNotification, GuardianRelation, User]),
    GuardianEventsModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
