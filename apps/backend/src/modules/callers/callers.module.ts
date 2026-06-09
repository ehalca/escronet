import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Caller } from "../../entities/caller.entity";
import { CallersService } from "./callers.service";

@Module({
  imports: [TypeOrmModule.forFeature([Caller])],
  controllers: [],
  providers: [CallersService],
  exports: [CallersService],
})
export class CallersModule {}
