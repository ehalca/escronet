import { Body, Controller, Get, Post } from "@nestjs/common";
import { SkipAuth } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CallerCheckInputSchema } from "@escronet/shared";
import type { CallerCheckInput } from "@escronet/shared";
import { StatsService } from "./stats.service";

@SkipAuth()
@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get("public")
  getPublicStats() {
    return this.statsService.getPublicStats();
  }

  @Post("caller-check")
  checkCaller(
    @Body(new ZodValidationPipe(CallerCheckInputSchema)) body: CallerCheckInput,
  ) {
    return this.statsService.checkCaller(body.phone);
  }
}
