import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionStatus, QuestionType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty({ example: 'What is your household income range?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @ApiPropertyOptional({ example: 'household-income-range' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  code?: string;

  @ApiPropertyOptional({ example: 'Income-related survey question.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ enum: QuestionStatus, default: QuestionStatus.DRAFT })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus = QuestionStatus.DRAFT;

  @ApiPropertyOptional({ type: [Object], example: [{ code: 'u30', value: 'Under 30k' }, { code: '30-60', value: '30k-60k' }] })
  @IsOptional()
  options?: Array<{ code: string; value: string; status?: 'ACTIVE' | 'INACTIVE' }>;
}
