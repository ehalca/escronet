import { Body, Controller, Post } from "@nestjs/common";
import { IsString, Length } from "class-validator";
import { AuthService } from "./auth.service";

class RequestOtpDto {
  @IsString()
  @Length(8, 24)
  phoneE164!: string;
}

class VerifyOtpDto {
  @IsString()
  @Length(8, 24)
  phoneE164!: string;

  @IsString()
  @Length(4, 10)
  code!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("otp/request")
  async requestOtp(@Body() dto: RequestOtpDto): Promise<{ accepted: true }> {
    await this.authService.requestOtp(dto.phoneE164);
    return { accepted: true };
  }

  @Post("otp/verify")
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ token: string }> {
    return this.authService.verifyOtp(dto.phoneE164, dto.code);
  }
}
