import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../entities/user.entity";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async register(input: {
    deviceId: string;
    fcmToken?: string;
  }): Promise<{ token: string; userId: string }> {
    let user = await this.userRepo.findOne({
      where: { deviceId: input.deviceId },
    });

    if (!user) {
      user = this.userRepo.create({
        deviceId: input.deviceId,
        fcmToken: input.fcmToken ?? null,
      });
      await this.userRepo.save(user);
    } else if (input.fcmToken && user.fcmToken !== input.fcmToken) {
      user.fcmToken = input.fcmToken;
      await this.userRepo.save(user);
    }

    // token = user ID for now; Firebase JWT verification replaces this later
    return { token: user.id, userId: user.id };
  }
}
