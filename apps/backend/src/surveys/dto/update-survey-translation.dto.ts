import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSurveyTranslationDto {
  @ApiPropertyOptional({ example: 'Household Survey' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Survey for household data collection.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
