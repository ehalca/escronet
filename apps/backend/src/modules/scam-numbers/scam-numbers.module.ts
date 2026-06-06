import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScamNumberEntity } from "../../entities/scam-number.entity";
import { ScamReportEntity } from "../../entities/scam-report.entity";
import { ScamNumbersController } from "./scam-numbers.controller";
import { ScamNumbersService } from "./scam-numbers.service";

@Module({
  imports: [TypeOrmModule.forFeature([ScamNumberEntity, ScamReportEntity])],
  controllers: [ScamNumbersController],
  providers: [ScamNumbersService],
  exports: [ScamNumbersService],
})
export class ScamNumbersModule {}
