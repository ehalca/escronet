import { Body, Controller, Post } from "@nestjs/common";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";
import { AlertsService } from "./alerts.service";

class CreateAlertDto {
  @IsString()
  @Length(1, 128)
  userId!: string;

  @IsString()
  @Length(1, 128)
  callId!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  score!: number;

  @IsOptional()
  @IsString()
  transcriptPreview?: string;

  @IsDateString()
  detectedAt!: string;
}

@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  create(@Body() dto: CreateAlertDto) {
    return this.alertsService.handleAlert(dto);
  }
}
