import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateQuestionTranslationDto {
  @ApiPropertyOptional({ example: 'What is your name?' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text?: string;

  @ApiPropertyOptional({ example: 'Personal identity question.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
