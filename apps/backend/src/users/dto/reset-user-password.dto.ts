import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @ApiProperty({ minLength: 12, example: 'NewSecurePassword123' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
