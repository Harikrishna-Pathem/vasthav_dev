import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateQuestionDto {
  @ApiPropertyOptional({ example: 'Updated question text' })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  text?: string;

  @ApiPropertyOptional({ example: 'updated-household-income-range' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  code?: string;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ type: [Object], example: [{ code: 'u30', value: 'Under 30k' }, { code: '30-60', value: '30k-60k' }] })
  @IsOptional()
  options?: Array<{ code: string; value: string; status?: 'ACTIVE' | 'INACTIVE' }>;
}
