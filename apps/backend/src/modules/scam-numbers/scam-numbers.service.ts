import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { ScamNumberEntity } from "../../entities/scam-number.entity";
import { ScamReportEntity } from "../../entities/scam-report.entity";

@Injectable()
export class ScamNumbersService {
  constructor(
    @InjectRepository(ScamNumberEntity)
    private readonly scamNumberRepo: Repository<ScamNumberEntity>,
    @InjectRepository(ScamReportEntity)
    private readonly reportRepo: Repository<ScamReportEntity>,
  ) {}

  async getDelta(
    updatedSinceIso: string,
    limit: number,
  ): Promise<{ records: ScamNumberEntity[] }> {
    const updatedSince = new Date(updatedSinceIso);
    const records = await this.scamNumberRepo.find({
      where: { updatedAt: MoreThan(updatedSince) },
      order: { updatedAt: "ASC" },
      take: limit,
    });

    return { records };
  }

  async submitCommunityReport(
    phoneHash: string,
    notes?: string,
  ): Promise<{ accepted: true }> {
    await this.reportRepo.save(
      this.reportRepo.create({
        phoneHash,
        notes,
        source: "community",
      }),
    );

    return { accepted: true };
  }
}
