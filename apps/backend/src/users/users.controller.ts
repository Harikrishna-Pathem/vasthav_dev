import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Permission, Permissions } from '../auth/decorators/permissions.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AuthenticatedUser } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Permissions(Permission.UserManage)
  @ApiOperation({ summary: 'Create a user account' })
  @ApiCreatedResponse({ description: 'User created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'User does not have permission to manage users.' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get()
  @Permissions(Permission.UserRead)
  @ApiOperation({ summary: 'List users with pagination and optional filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({ description: 'Paginated users list.' })
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Get(':id')
  @Permissions(Permission.UserRead)
  @ApiOperation({ summary: 'Fetch a specific user' })
  @ApiOkResponse({ description: 'The requested user.' })
  getById(@Param('id') id: string) {
    return this.users.getById(id);
  }

  @Patch(':id')
  @Permissions(Permission.UserManage)
  @ApiOperation({ summary: 'Update allowed user profile fields' })
  @ApiOkResponse({ description: 'User updated successfully.' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(id, dto);
  }

  @Patch(':id/status')
  @Permissions(Permission.UserManage)
  @ApiOperation({ summary: 'Activate or deactivate a user and revoke sessions when disabling' })
  @ApiOkResponse({ description: 'User status updated.' })
  setStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.setStatus(id, dto, user.id);
  }

  @Patch(':id/roles')
  @Permissions(Permission.UserManage)
  @ApiOperation({ summary: 'Assign or replace a user role set' })
  @ApiOkResponse({ description: 'User roles updated.' })
  assignRoles(@Param('id') id: string, @Body() dto: UpdateUserRolesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.assignRoles(id, dto.role, user.id);
  }

  @Patch(':id/password')
  @Permissions(Permission.UserManage)
  @ApiOperation({ summary: 'Reset a user password securely' })
  @ApiOkResponse({ description: 'Password reset successful.' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetUserPasswordDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.resetPassword(id, dto, user.id);
  }
}
