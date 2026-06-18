import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntitySubscriberInterface, EventSubscriber, InsertEvent } from "typeorm";
import { RiskLevel, ScamType } from "@escronet/shared";
import { Report } from "../../entities/report.entity";
import { Alert } from "../../entities/alert.entity";
import { Caller } from "../../entities/caller.entity";

interface ReportRow {
  alertId: string;
  type: ScamType;
}

// Each alertId represents one independent call detection; guardian + user
// reporting the same alertId count as one signal, not two.
function uniqueAlertsByType(rows: ReportRow[], threshold: number): boolean {
  const byType = new Map<ScamType, Set<string>>();
  for (const r of rows) {
    if (!byType.has(r.type)) byType.set(r.type, new Set());
    byType.get(r.type)!.add(r.alertId);
  }
  return [...byType.values()].some((s) => s.size > threshold);
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

@Injectable()
@EventSubscriber()
export class ReportSubscriber implements EntitySubscriberInterface<Report> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Report;
  }

  async afterInsert(event: InsertEvent<Report>): Promise<void> {
    const em = event.manager;

    const alert = await em.findOneBy(Alert, { id: event.entity.alertId });
    if (!alert) return;

    const callerHash = alert.callerHash;

    const getReports = async (since: Date): Promise<ReportRow[]> =>
      em
        .createQueryBuilder(Report, "r")
        .innerJoin(Alert, "a", "a.id = r.alert_id")
        .where("a.caller_hash = :callerHash", { callerHash })
        .andWhere("r.created_at >= :since", { since })
        .select(["r.alert_id AS \"alertId\"", "r.type AS type"])
        .getRawMany<ReportRow>();

    const [rows3h, rows6h, rows12h] = await Promise.all([
      getReports(hoursAgo(3)),
      getReports(hoursAgo(6)),
      getReports(hoursAgo(12)),
    ]);

    let riskLevel: RiskLevel | null = null;

    if (uniqueAlertsByType(rows3h, 5)) {
      riskLevel = RiskLevel.HIGHEST;
    } else if (uniqueAlertsByType(rows3h, 2)) {
      riskLevel = RiskLevel.HIGH;
    } else if (uniqueAlertsByType(rows6h, 2)) {
      riskLevel = RiskLevel.MEDIUM;
    } else {
      const uniqueAlerts12h = new Set(rows12h.map((r) => r.alertId)).size;
      if (uniqueAlerts12h > 3) riskLevel = RiskLevel.LOW;
    }

    if (!riskLevel) return;

    await em
      .createQueryBuilder()
      .insert()
      .into(Caller)
      .values({ phoneNumber: callerHash, riskLevel })
      .orUpdate(["risk_level"], ["phone_number"])
      .execute();
  }
}
