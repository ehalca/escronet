import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Report } from "../../entities/report.entity";
import { Alert } from "../../entities/alert.entity";
import { Caller } from "../../entities/caller.entity";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { ReportSubscriber } from "./report.subscriber";

@Module({
  imports: [TypeOrmModule.forFeature([Report, Alert, Caller])],
  controllers: [ReportsController],
  providers: [ReportsService, ReportSubscriber],
})
export class ReportsModule {}
