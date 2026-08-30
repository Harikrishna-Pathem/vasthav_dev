import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateSurveyDto {
  @ApiPropertyOptional({ example: 'Updated Household Survey' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({ example: 'updated-household-survey' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  code?: string;

  @ApiPropertyOptional({ example: 'Updated survey description.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
