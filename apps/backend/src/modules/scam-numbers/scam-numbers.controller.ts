import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { ScamNumbersService } from "./scam-numbers.service";

class DeltaQueryDto {
  @IsDateString()
  updatedSince!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;
}

class ReportScamNumberDto {
  @IsString()
  phoneHash!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller("scam-numbers")
export class ScamNumbersController {
  constructor(private readonly scamNumbersService: ScamNumbersService) {}

  @Get("delta")
  getDelta(@Query() query: DeltaQueryDto) {
    return this.scamNumbersService.getDelta(
      query.updatedSince,
      query.limit ?? 1000,
    );
  }

  @Post("reports")
  submitReport(@Body() dto: ReportScamNumberDto) {
    return this.scamNumbersService.submitCommunityReport(
      dto.phoneHash,
      dto.notes,
    );
  }
}
