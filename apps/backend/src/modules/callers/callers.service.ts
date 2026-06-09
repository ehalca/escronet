import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import type { CallerDeltaRecord } from "@escronet/shared";
import { Caller } from "../../entities/caller.entity";

@Injectable()
export class CallersService {
  constructor(
    @InjectRepository(Caller)
    private readonly callerRepo: Repository<Caller>,
  ) {}

  async getDelta({
    lastSyncDate,
    limit,
  }: {
    lastSyncDate: string;
    limit: number;
  }): Promise<{ records: CallerDeltaRecord[] }> {
    const since = new Date(lastSyncDate);
    const rows = await this.callerRepo.find({
      withDeleted: true,
      where: [
        { updatedAt: MoreThan(since) },
        { deleteAt: MoreThan(since) as unknown as Date },
      ],
      order: { updatedAt: "ASC" },
      take: limit,
    });
    const records: CallerDeltaRecord[] = rows.map((r) => ({
      id: r.id,
      phoneNumber: r.phoneNumber,
      riskLevel: r.riskLevel,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      deleteAt: r.deleteAt ? r.deleteAt.toISOString() : null,
    }));
    return { records };
  }
}
