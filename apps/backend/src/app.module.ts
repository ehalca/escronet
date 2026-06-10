import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TerminusModule } from "@nestjs/terminus";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Caller } from "./entities/caller.entity";
import { GuardianLink } from "./entities/guardian-link.entity";
import { GuardianRelation } from "./entities/guardian-relation.entity";
import { User } from "./entities/user.entity";
import { AuthModule } from "./modules/auth/auth.module";
import { CallersModule } from "./modules/callers/callers.module";
import { GuardianEventsModule } from "./gateway/guardian-events.module";
import { GuardianLinksModule } from "./modules/guardian-links/guardian-links.module";
import { GuardiansModule } from "./modules/guardians/guardians.module";
import { HealthController } from "./controllers/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("DB_HOST", "localhost"),
        port: Number(config.get<string>("DB_PORT", "5432")),
        username: config.get<string>("DB_USER", "escronet"),
        password: config.get<string>("DB_PASSWORD", "escronet"),
        database: config.get<string>("DB_NAME", "escronet"),
        synchronize: true,
        entities: [Caller, GuardianLink, GuardianRelation, User],
      }),
    }),
    TerminusModule,
    AuthModule,
    CallersModule,
    GuardianEventsModule,
    GuardianLinksModule,
    GuardiansModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
