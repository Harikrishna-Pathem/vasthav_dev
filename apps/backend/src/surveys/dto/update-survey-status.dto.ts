import { ApiProperty } from '@nestjs/swagger';
import { SurveyStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateSurveyStatusDto {
  @ApiProperty({ enum: SurveyStatus })
  @IsEnum(SurveyStatus)
  status!: SurveyStatus;
}
