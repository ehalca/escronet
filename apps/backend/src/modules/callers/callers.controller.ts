import { Controller, Get, Query } from "@nestjs/common";
import { CallerDeltaQuerySchema } from "@escronet/shared";
import type { CallerDeltaQuery } from "@escronet/shared";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CallersService } from "./callers.service";

@Controller("callers")
export class CallersController {
  constructor(private readonly callersService: CallersService) {}

  @Get("delta")
  getDelta(
    @Query(new ZodValidationPipe(CallerDeltaQuerySchema)) query: CallerDeltaQuery,
  ) {
    return this.callersService.getDelta(query);
  }
}
