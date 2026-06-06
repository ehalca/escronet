import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DesignatedContactEntity } from "../../entities/designated-contact.entity";

export type UpsertContactInput = {
  ownerUserId: string;
  contactPhoneHash: string;
  fcmToken: string;
  displayName: string;
};

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(DesignatedContactEntity)
    private readonly contactsRepo: Repository<DesignatedContactEntity>,
  ) {}

  async upsertDesignatedContact(
    input: UpsertContactInput,
  ): Promise<DesignatedContactEntity> {
    const existing = await this.contactsRepo.findOne({
      where: { ownerUserId: input.ownerUserId },
    });

    if (existing) {
      existing.contactPhoneHash = input.contactPhoneHash;
      existing.fcmToken = input.fcmToken;
      existing.displayName = input.displayName;
      return this.contactsRepo.save(existing);
    }

    return this.contactsRepo.save(this.contactsRepo.create(input));
  }

  async getDesignatedContact(
    ownerUserId: string,
  ): Promise<DesignatedContactEntity | null> {
    return this.contactsRepo.findOne({ where: { ownerUserId } });
  }
}
