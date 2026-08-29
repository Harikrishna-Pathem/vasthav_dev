import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateUserDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty({ minLength: 12 }) @IsString() @MinLength(12) @MaxLength(128) password!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(150) displayName!: string;
  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER }) @IsEnum(UserRole) role: UserRole = UserRole.USER;
}
