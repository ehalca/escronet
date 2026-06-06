import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";

@Injectable()
export class AuthService {
  async requestOtp(_phoneE164: string): Promise<void> {
    // Integrate your SMS provider here.
  }

  async verifyOtp(
    phoneE164: string,
    _code: string,
  ): Promise<{ token: string }> {
    // Replace this with signed JWT generation after OTP validation.
    const token = Buffer.from(
      `${phoneE164}:${randomBytes(16).toString("hex")}`,
    ).toString("base64url");
    return { token };
  }
}
