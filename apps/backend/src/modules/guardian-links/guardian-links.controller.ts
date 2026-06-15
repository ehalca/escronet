import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ClaimGuardianLinkInputSchema } from "@escronet/shared";
import type { ClaimGuardianLinkInput } from "@escronet/shared";
import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { GuardianLinksService } from "./guardian-links.service";

@Controller("guardian-links")
export class GuardianLinksController {
  constructor(private readonly guardianLinksService: GuardianLinksService) {}

  @Post("generate")
  generate(@CurrentUser() userId: string) {
    return this.guardianLinksService.generate(userId);
  }

  @Post("claim")
  claim(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(ClaimGuardianLinkInputSchema)) body: ClaimGuardianLinkInput,
  ) {
    return this.guardianLinksService.claim(userId, body);
  }

  @Get()
  list(@CurrentUser() userId: string) {
    return this.guardianLinksService.listByUser(userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.guardianLinksService.delete(userId, id);
  }
}
