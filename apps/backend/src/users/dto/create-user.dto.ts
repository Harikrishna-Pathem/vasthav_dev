import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserLanguage, UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 12, example: 'SecurePassword123' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Asha Reddy' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  displayName!: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole)
  role: UserRole = UserRole.USER;

  @ApiPropertyOptional({ enum: UserLanguage, default: UserLanguage.en })
  @IsOptional()
  @IsEnum(UserLanguage)
  preferredLanguage?: UserLanguage = UserLanguage.en;
}
