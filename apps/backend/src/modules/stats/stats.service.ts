import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Alert } from "../../entities/alert.entity";
import { Caller } from "../../entities/caller.entity";
import { GuardianRelation } from "../../entities/guardian-relation.entity";
import { User } from "../../entities/user.entity";
import { hashE164Phone, normalizeE164 } from "../../common/hash.util";
import type { CallerCheckResult, PublicStats } from "@escronet/shared";

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(Caller)
    private readonly callerRepo: Repository<Caller>,
    @InjectRepository(GuardianRelation)
    private readonly relationRepo: Repository<GuardianRelation>,
  ) {}

  async getPublicStats(): Promise<PublicStats> {
    const [userCount, guardianCount, levelRows] = await Promise.all([
      this.userRepo.count(),
      this.relationRepo.count(),
      this.alertRepo
        .createQueryBuilder("alert")
        .select("alert.riskLevel", "level")
        .addSelect("COUNT(*)", "n")
        .groupBy("alert.riskLevel")
        .getRawMany<{ level: string; n: string }>(),
    ]);

    const byLevel: Record<string, number> = {};
    for (const row of levelRows) {
      byLevel[row.level] = Number(row.n);
    }

    return {
      userCount,
      guardianCount,
      alertsByLevel: {
        lowest: byLevel["lowest"] ?? 0,
        low: byLevel["low"] ?? 0,
        medium: byLevel["medium"] ?? 0,
        high: byLevel["high"] ?? 0,
        highest: byLevel["highest"] ?? 0,
      },
    };
  }

  async checkCaller(rawPhone: string): Promise<CallerCheckResult> {
    const normalized = normalizeE164(rawPhone);
    const callerHash = hashE164Phone(rawPhone);

    const [caller, levelRows] = await Promise.all([
      this.callerRepo.findOne({ where: { phoneNumber: normalized } }),
      this.alertRepo
        .createQueryBuilder("alert")
        .select("alert.riskLevel", "level")
        .addSelect("COUNT(*)", "n")
        .where("alert.callerHash = :callerHash", { callerHash })
        .groupBy("alert.riskLevel")
        .getRawMany<{ level: string; n: string }>(),
    ]);

    const byLevel: Record<string, number> = {};
    for (const row of levelRows) {
      byLevel[row.level] = Number(row.n);
    }

    const alertsByLevel = {
      lowest: byLevel["lowest"] ?? 0,
      low: byLevel["low"] ?? 0,
      medium: byLevel["medium"] ?? 0,
      high: byLevel["high"] ?? 0,
      highest: byLevel["highest"] ?? 0,
    };

    const totalAlerts = Object.values(alertsByLevel).reduce((a, b) => a + b, 0);

    return {
      inCallerDatabase: caller !== null,
      callerRiskLevel: caller?.riskLevel ?? null,
      totalAlerts,
      alertsByLevel,
    };
  }
}
