import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SurveyStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class CreateSurveyDto {
  @ApiProperty({ example: 'Household Survey' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'household-survey' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  code?: string;

  @ApiPropertyOptional({ example: 'Survey for household-level data collection.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: SurveyStatus, default: SurveyStatus.DRAFT })
  @IsOptional()
  @IsEnum(SurveyStatus)
  status?: SurveyStatus = SurveyStatus.DRAFT;
}
