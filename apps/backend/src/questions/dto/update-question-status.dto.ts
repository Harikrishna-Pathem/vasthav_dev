import { ApiProperty } from '@nestjs/swagger';
import { QuestionStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateQuestionStatusDto {
  @ApiProperty({ enum: QuestionStatus })
  @IsEnum(QuestionStatus)
  status!: QuestionStatus;
}
