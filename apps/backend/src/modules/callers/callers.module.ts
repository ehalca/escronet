import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Caller } from "../../entities/caller.entity";
import { CallersService } from "./callers.service";
import { CallersController } from "./callers.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Caller])],
  controllers: [CallersController],
  providers: [CallersService],
  exports: [CallersService],
})
export class CallersModule {}
