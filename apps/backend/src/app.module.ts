import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TerminusModule } from "@nestjs/terminus";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Alert } from "./entities/alert.entity";
import { AlertNotification } from "./entities/alert-notification.entity";
import { Caller } from "./entities/caller.entity";
import { GuardianLink } from "./entities/guardian-link.entity";
import { GuardianRelation } from "./entities/guardian-relation.entity";
import { Report } from "./entities/report.entity";
import { User } from "./entities/user.entity";
import { AlertsModule } from "./modules/alerts/alerts.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CallersModule } from "./modules/callers/callers.module";
import { FirebaseModule } from "./modules/firebase/firebase.module";
import { GuardianEventsModule } from "./gateway/guardian-events.module";
import { GuardianLinksModule } from "./modules/guardian-links/guardian-links.module";
import { GuardiansModule } from "./modules/guardians/guardians.module";
import { AccountModule } from "./modules/account/account.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { StatsModule } from "./modules/stats/stats.module";
import { FirebaseAuthGuard } from "./common/auth.guard";
import { HealthController } from "./controllers/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>("RUNNING_MODE", "dev") === "prod";
        return {
          type: "postgres",
          host: config.get<string>("DB_HOST", "localhost"),
          port: Number(config.get<string>("DB_PORT", "5432")),
          username: config.get<string>("DB_USER", "escronet"),
          password: config.get<string>("DB_PASSWORD", "escronet"),
          database: config.get<string>("DB_NAME", "escronet"),
          synchronize: !isProd,
          entities: [Alert, AlertNotification, Caller, GuardianLink, GuardianRelation, Report, User],
        };
      },
    }),
    TerminusModule,
    AlertsModule,
    AuthModule,
    CallersModule,
    FirebaseModule,
    GuardianEventsModule,
    GuardianLinksModule,
    GuardiansModule,
    AccountModule,
    ReportsModule,
    StatsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
  ],
})
export class AppModule {}
