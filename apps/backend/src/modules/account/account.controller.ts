import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { SkipAuth } from "../../common/current-user.decorator";
import { AccountService } from "./account.service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller({ path: "account", version: "1" })
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /** Lightweight existence check — requires auth. Returns 401 if the account has been deleted. */
  @Get("me")
  @HttpCode(HttpStatus.OK)
  me() {
    return { ok: true };
  }

  @SkipAuth()
  @Post("delete")
  @HttpCode(HttpStatus.OK)
  async delete(@Body() body: { userId: string }) {
    if (!body.userId || !UUID_RE.test(body.userId)) {
      throw new BadRequestException("userId must be a valid UUID");
    }
    await this.accountService.deleteAccount(body.userId);
    return { deleted: true };
  }
}
