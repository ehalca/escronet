import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AlertEntity } from "./entities/alert.entity";
import { DesignatedContactEntity } from "./entities/designated-contact.entity";
import { ScamNumberEntity } from "./entities/scam-number.entity";
import { ScamReportEntity } from "./entities/scam-report.entity";
import { AlertsModule } from "./modules/alerts/alerts.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { ScamNumbersModule } from "./modules/scam-numbers/scam-numbers.module";

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
        synchronize: false,
        entities: [
          AlertEntity,
          DesignatedContactEntity,
          ScamNumberEntity,
          ScamReportEntity,
        ],
      }),
    }),
    AuthModule,
    ScamNumbersModule,
    ContactsModule,
    AlertsModule,
  ],
})
export class AppModule {}
