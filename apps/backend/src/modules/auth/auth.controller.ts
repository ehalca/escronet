import { Body, Controller, Post } from "@nestjs/common";
import { RegisterDeviceInputSchema } from "@escronet/shared";
import type { RegisterDeviceInput } from "@escronet/shared";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(
    @Body(new ZodValidationPipe(RegisterDeviceInputSchema)) body: RegisterDeviceInput,
  ) {
    return this.authService.register(body);
  }
}
