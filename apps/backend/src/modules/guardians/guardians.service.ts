import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GuardianRelation } from "../../entities/guardian-relation.entity";
import { GuardianEventsGateway } from "../../gateway/guardian-events.gateway";
import type { GuardianRecord, GuardedUser } from "@escronet/shared";

@Injectable()
export class GuardiansService {
  constructor(
    @InjectRepository(GuardianRelation)
    private readonly relationRepo: Repository<GuardianRelation>,
    private readonly events: GuardianEventsGateway,
  ) {}

  async listGuardians(userId: string): Promise<{ guardians: GuardianRecord[] }> {
    const rows = await this.relationRepo.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });
    return {
      guardians: rows.map((r) => ({
        id: r.id,
        userLabel: r.userLabel,
        guardianLabel: r.guardianLabel,
        guardianUserId: r.guardianUserId,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async listGuardedUsers(guardianUserId: string): Promise<{ guardedUsers: GuardedUser[] }> {
    const rows = await this.relationRepo.find({
      where: { guardianUserId },
      order: { createdAt: "ASC" },
    });
    return {
      guardedUsers: rows.map((r) => ({
        id: r.id,
        userLabel: r.userLabel,
        guardianLabel: r.guardianLabel,
        userId: r.userId,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Each side updates THEIR label:
   * - Protected user (userId) → sets userLabel (how they name the guardian)
   * - Guardian (guardianUserId) → sets guardianLabel (how they name the user)
   */
  async updateLabel(requesterId: string, relationId: string, label: string): Promise<void> {
    const relation = await this.relationRepo.findOne({ where: { id: relationId } });
    if (!relation) throw new NotFoundException("Guardian relation not found");

    if (relation.userId === requesterId) {
      relation.userLabel = label;
    } else if (relation.guardianUserId === requesterId) {
      relation.guardianLabel = label;
    } else {
      throw new ForbiddenException("Not part of this guardian relation");
    }

    await this.relationRepo.save(relation);
  }

  async remove(requesterId: string, relationId: string): Promise<void> {
    const relation = await this.relationRepo.findOne({ where: { id: relationId } });
    if (!relation) throw new NotFoundException("Guardian relation not found");

    if (relation.userId !== requesterId && relation.guardianUserId !== requesterId) {
      throw new ForbiddenException("Not authorized to remove this guardian relation");
    }

    const { userId, guardianUserId } = relation;
    await this.relationRepo.remove(relation);
    this.events.notifyRemoved(userId, guardianUserId, relationId);
  }
}
