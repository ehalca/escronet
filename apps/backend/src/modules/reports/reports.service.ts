import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Report } from "../../entities/report.entity";
import { Alert } from "../../entities/alert.entity";
import type { CreateReportInput, CreateReportResponse } from "@escronet/shared";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
  ) {}

  async createReport(userId: string, input: CreateReportInput): Promise<CreateReportResponse> {
    const alert = await this.alertRepo.findOneBy({ id: input.alertId });
    if (!alert) throw new NotFoundException("Alert not found");

    const existing = await this.reportRepo.findOneBy({ alertId: input.alertId, reporterId: userId });
    if (existing) throw new ConflictException("Already reported");

    const report = this.reportRepo.create({
      alertId: input.alertId,
      reporterId: userId,
      type: input.type,
    });
    await this.reportRepo.save(report);

    return {
      report: {
        id: report.id,
        alertId: report.alertId,
        reporterId: report.reporterId,
        type: report.type,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      },
    };
  }
}
