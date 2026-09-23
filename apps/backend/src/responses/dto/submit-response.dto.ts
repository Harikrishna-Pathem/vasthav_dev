import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class SubmitAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsNotEmpty()
  answer!: unknown;
}

export class SubmitResponseDto {
  @IsUUID()
  surveyId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];
}