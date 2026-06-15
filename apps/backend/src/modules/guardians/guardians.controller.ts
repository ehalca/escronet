import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from "@nestjs/common";
import { UpdateLabelInputSchema } from "@escronet/shared";
import type { UpdateLabelInput } from "@escronet/shared";
import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { GuardiansService } from "./guardians.service";

@Controller("guardians")
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Get()
  listGuardians(@CurrentUser() userId: string) {
    return this.guardiansService.listGuardians(userId);
  }

  @Get("guarding")
  listGuardedUsers(@CurrentUser() userId: string) {
    return this.guardiansService.listGuardedUsers(userId);
  }

  @Patch(":id/label")
  updateLabel(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateLabelInputSchema)) body: UpdateLabelInput,
  ) {
    return this.guardiansService.updateLabel(userId, id, body.label);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.guardiansService.remove(userId, id);
  }
}
