import { ApiProperty } from '@nestjs/swagger';
import { UserLanguage } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateQuestionTranslationDto {
  @ApiProperty({ enum: UserLanguage, example: UserLanguage.en })
  @IsEnum(UserLanguage)
  language!: UserLanguage;

  @ApiProperty({ example: 'What is your name?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @ApiProperty({ example: 'Personal identity question.', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
