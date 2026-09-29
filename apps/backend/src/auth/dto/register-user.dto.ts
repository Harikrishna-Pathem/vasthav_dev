import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'matchesPassword', async: false })
class MatchesPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    return typeof value === 'string'
      && value === (args.object as { password?: unknown }).password;
  }

  defaultMessage() {
    return 'confirmPassword must match password';
  }
}

export class RegisterUserDto {
  @ApiProperty({ example: 'Asha Reddy', maxLength: 150 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  displayName!: string;

  @ApiProperty({ example: 'asha@example.com', maxLength: 320 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: '9876543210', description: 'Indian mobile number in 10-digit format.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'mobileNumber must be a valid 10-digit Indian mobile number' })
  mobileNumber!: string;

  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Validate(MatchesPasswordConstraint)
  confirmPassword!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  constituencyId!: string;
}
