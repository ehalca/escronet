import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AlertEntity } from "../../entities/alert.entity";
import { DesignatedContactEntity } from "../../entities/designated-contact.entity";
import { FcmService } from "./fcm.service";

export type AlertInput = {
  userId: string;
  callId: string;
  score: number;
  transcriptPreview?: string;
  detectedAt: string;
};

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertEntity)
    private readonly alertRepo: Repository<AlertEntity>,
    @InjectRepository(DesignatedContactEntity)
    private readonly contactsRepo: Repository<DesignatedContactEntity>,
    private readonly fcmService: FcmService,
  ) {}

  async handleAlert(
    input: AlertInput,
  ): Promise<{ accepted: true; contactNotified: boolean }> {
    await this.alertRepo.save(
      this.alertRepo.create({
        ownerUserId: input.userId,
        callId: input.callId,
        score: input.score,
        transcriptPreview: input.transcriptPreview,
      }),
    );

    const contact = await this.contactsRepo.findOne({
      where: { ownerUserId: input.userId },
    });

    if (!contact) {
      return { accepted: true, contactNotified: false };
    }

    await this.fcmService.sendScamAlert(contact.fcmToken, {
      userId: input.userId,
      score: input.score,
      detectedAt: input.detectedAt,
      displayName: contact.displayName,
    });

    return { accepted: true, contactNotified: true };
  }
}
