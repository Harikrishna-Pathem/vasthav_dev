import { ApiProperty } from '@nestjs/swagger';
import { QuestionOptionStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class CreateQuestionOptionDto {
  @ApiProperty({ example: 'u30' })
  @IsString()
  @Length(1, 100)
  code!: string;

  @ApiProperty({ example: 'Under 30k' })
  @IsString()
  @Length(1, 500)
  value!: string;

  @ApiProperty({ enum: QuestionOptionStatus, default: QuestionOptionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(QuestionOptionStatus)
  status?: QuestionOptionStatus = QuestionOptionStatus.ACTIVE;
}
