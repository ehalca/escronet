import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GuardianLink } from "../../entities/guardian-link.entity";
import { GuardianRelation } from "../../entities/guardian-relation.entity";
import { GuardianEventsGateway } from "../../gateway/guardian-events.gateway";
import type {
  ClaimGuardianLinkResponse,
  GenerateGuardianLinkResponse,
  GuardianLinkRecord,
} from "@escronet/shared";

const LINK_TTL_HOURS = 24;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const QR_BASE_URL = "https://escro.net/link";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

@Injectable()
export class GuardianLinksService {
  constructor(
    @InjectRepository(GuardianLink)
    private readonly linkRepo: Repository<GuardianLink>,
    @InjectRepository(GuardianRelation)
    private readonly relationRepo: Repository<GuardianRelation>,
    private readonly events: GuardianEventsGateway,
  ) {}

  async generate(userId: string): Promise<GenerateGuardianLinkResponse> {
    const expiresAt = new Date(Date.now() + LINK_TTL_HOURS * 60 * 60 * 1000);

    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      if (attempts > 10) throw new Error("Failed to generate unique code");
    } while (await this.linkRepo.exists({ where: { code } }));

    const link = this.linkRepo.create({ code, expiresAt, usedAt: null, userId, relationId: null });
    await this.linkRepo.save(link);

    return {
      id: link.id,
      code: link.code,
      qrUrl: `${QR_BASE_URL}?code=${link.code}`,
      expiresAt: link.expiresAt.toISOString(),
    };
  }

  async claim(
    guardianUserId: string,
    input: { code: string; userLabel: string; guardianLabel?: string },
  ): Promise<ClaimGuardianLinkResponse> {
    const link = await this.linkRepo.findOne({ where: { code: input.code.toUpperCase() } });

    if (!link) throw new NotFoundException("Guardian link not found");
    if (link.usedAt) throw new BadRequestException("Guardian link already used");
    if (link.expiresAt < new Date()) throw new BadRequestException("Guardian link expired");
    if (link.userId === guardianUserId) {
      throw new BadRequestException("Cannot claim your own guardian link");
    }

    const relation = this.relationRepo.create({
      userId: link.userId,
      guardianUserId,
      userLabel: input.userLabel,
      guardianLabel: input.guardianLabel ?? null,
    });
    await this.relationRepo.save(relation);

    link.usedAt = new Date();
    link.relationId = relation.id;
    await this.linkRepo.save(link);

    this.events.notifyPaired(link.userId, guardianUserId, relation.id);

    return { relationId: relation.id, guardedUserId: link.userId };
  }

  async listByUser(userId: string): Promise<{ links: GuardianLinkRecord[] }> {
    const links = await this.linkRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
    return {
      links: links.map((l) => ({
        id: l.id,
        code: l.code,
        expiresAt: l.expiresAt.toISOString(),
        usedAt: l.usedAt ? l.usedAt.toISOString() : null,
      })),
    };
  }

  async delete(userId: string, linkId: string): Promise<void> {
    const link = await this.linkRepo.findOne({ where: { id: linkId } });
    if (!link) throw new NotFoundException("Guardian link not found");
    if (link.userId !== userId) throw new ForbiddenException("Not your guardian link");
    if (link.usedAt) throw new BadRequestException("Cannot delete a claimed link");
    await this.linkRepo.remove(link);
  }
}
