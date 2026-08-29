import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Permissions, Permission } from '../auth/decorators/permissions.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Post() @Permissions(Permission.UserManage) @ApiOperation({ summary: 'Create a user' }) create(@Body() dto: CreateUserDto) { return this.users.create(dto); }
  @Get() @Permissions(Permission.UserRead) @ApiOperation({ summary: 'List active and inactive users' }) list() { return this.users.list(); }
  @Patch(':id/activate') @Permissions(Permission.UserManage) @ApiOperation({ summary: 'Activate a user' }) activate(@Param('id') id: string) { return this.users.setActive(id, true); }
  @Patch(':id/deactivate') @Permissions(Permission.UserManage) @ApiOperation({ summary: 'Deactivate a user and revoke sessions' }) deactivate(@Param('id') id: string) { return this.users.setActive(id, false); }
}
