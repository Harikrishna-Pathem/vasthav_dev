import { ApiProperty } from '@nestjs/swagger';
import { UserLanguage } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSurveyTranslationDto {
  @ApiProperty({ enum: UserLanguage, example: UserLanguage.en })
  @IsEnum(UserLanguage)
  language!: UserLanguage;

  @ApiProperty({ example: 'Household Survey' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'Survey for household data collection.', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
