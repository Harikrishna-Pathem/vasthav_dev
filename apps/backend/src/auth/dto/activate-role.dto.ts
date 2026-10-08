import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ActivateRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  activeRole!: UserRole;
}
