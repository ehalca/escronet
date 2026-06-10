import { Module } from "@nestjs/common";
import { GuardianEventsGateway } from "./guardian-events.gateway";

@Module({
  providers: [GuardianEventsGateway],
  exports: [GuardianEventsGateway],
})
export class GuardianEventsModule {}
