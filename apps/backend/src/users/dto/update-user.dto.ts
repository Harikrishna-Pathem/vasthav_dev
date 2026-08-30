import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserLanguage } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'New Name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  displayName?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: UserLanguage, default: UserLanguage.en })
  @IsOptional()
  @IsEnum(UserLanguage)
  preferredLanguage?: UserLanguage;
}
