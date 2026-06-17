import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Alert } from "../../entities/alert.entity";
import { GuardianLink } from "../../entities/guardian-link.entity";
import { GuardianRelation } from "../../entities/guardian-relation.entity";
import { User } from "../../entities/user.entity";
import { FirebaseService } from "../firebase/firebase.service";

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(GuardianRelation)
    private readonly guardianRelationRepo: Repository<GuardianRelation>,
    @InjectRepository(GuardianLink)
    private readonly guardianLinkRepo: Repository<GuardianLink>,
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    private readonly firebase: FirebaseService,
  ) {}

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("Account not found");

    if (user.firebaseUid && this.firebase.isReady) {
      try {
        await this.firebase.auth().deleteUser(user.firebaseUid);
      } catch (err) {
        this.logger.warn(`Firebase user deletion failed for ${user.firebaseUid}: ${String(err)}`);
      }
    }

    // Explicit deletion in dependency order — DB CASCADE may not be present on
    // existing constraints when synchronize:true didn't recreate them.
    await this.guardianRelationRepo.delete({ userId });
    await this.guardianRelationRepo.delete({ guardianUserId: userId });
    await this.guardianLinkRepo.delete({ userId });
    await this.alertRepo.delete({ userId });
    await this.userRepo.delete(userId);

    this.logger.log(`Account deleted: userId=${userId}`);
  }
}
