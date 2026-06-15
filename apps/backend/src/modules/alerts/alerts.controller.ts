import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { CreateAlertInputSchema, UpdateAlertStatusInputSchema, UpdateAlertRiskInputSchema } from "@escronet/shared";
import type { CreateAlertInput, UpdateAlertStatusInput, UpdateAlertRiskInput } from "@escronet/shared";
import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { AlertsService } from "./alerts.service";

@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  createAlert(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(CreateAlertInputSchema)) body: CreateAlertInput,
  ) {
    return this.alertsService.createAlert(userId, body);
  }

  @Get()
  listMyAlerts(@CurrentUser() userId: string) {
    return this.alertsService.listMyAlerts(userId);
  }

  @Get("notifications")
  listNotifications(@CurrentUser() userId: string) {
    return this.alertsService.listGuardianNotifications(userId);
  }

  @Patch(":id/risk")
  @HttpCode(HttpStatus.NO_CONTENT)
  updateRisk(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateAlertRiskInputSchema)) body: UpdateAlertRiskInput,
  ) {
    return this.alertsService.updateAlertRisk(id, userId, body.riskLevel);
  }

  @Patch(":id/status")
  @HttpCode(HttpStatus.NO_CONTENT)
  updateStatus(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateAlertStatusInputSchema)) body: UpdateAlertStatusInput,
  ) {
    return this.alertsService.updateAlertStatus(id, userId, body.status);
  }

  @Patch("notifications/:id/seen")
  @HttpCode(HttpStatus.NO_CONTENT)
  markSeen(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.alertsService.markSeen(id, userId);
  }
}
