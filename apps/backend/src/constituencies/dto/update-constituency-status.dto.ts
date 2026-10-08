import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateConstituencyStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
