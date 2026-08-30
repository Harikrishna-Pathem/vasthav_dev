import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionOptionStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateQuestionOptionDto {
  @ApiPropertyOptional({ example: '30-60' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  code?: string;

  @ApiPropertyOptional({ example: '30k-60k' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  value?: string;

  @ApiPropertyOptional({ enum: QuestionOptionStatus })
  @IsOptional()
  @IsEnum(QuestionOptionStatus)
  status?: QuestionOptionStatus;
}
