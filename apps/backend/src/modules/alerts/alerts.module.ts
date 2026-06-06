import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AlertEntity } from "../../entities/alert.entity";
import { DesignatedContactEntity } from "../../entities/designated-contact.entity";
import { AlertsController } from "./alerts.controller";
import { AlertsService } from "./alerts.service";
import { FcmService } from "./fcm.service";

@Module({
  imports: [TypeOrmModule.forFeature([AlertEntity, DesignatedContactEntity])],
  controllers: [AlertsController],
  providers: [AlertsService, FcmService],
})
export class AlertsModule {}
