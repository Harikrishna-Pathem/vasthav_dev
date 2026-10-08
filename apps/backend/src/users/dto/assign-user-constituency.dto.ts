import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';

export class AssignUserConstituencyDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  @ValidateIf((_object, value) => value !== null)
  @IsUUID()
  constituencyId!: string | null;
}
