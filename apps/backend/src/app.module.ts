import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Caller } from "./entities/caller.entity";
import { Guardian } from "./entities/guardian.entity";
import { User } from "./entities/user.entity";
import { CallersModule } from "./modules/callers/callers.module";

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
        entities: [Caller, Guardian, User],
      }),
    }),
    CallersModule,
  ],
})
export class AppModule {}
