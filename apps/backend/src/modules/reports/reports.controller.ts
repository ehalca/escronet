import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CreateReportInputSchema } from "@escronet/shared";
import type { CreateReportInput } from "@escronet/shared";
import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createReport(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(CreateReportInputSchema)) body: CreateReportInput,
  ) {
    return this.reportsService.createReport(userId, body);
  }
}
