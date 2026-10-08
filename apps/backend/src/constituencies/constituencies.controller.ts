import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Permission, Permissions } from '../auth/decorators/permissions.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ConstituenciesService } from './constituencies.service.js';
import { CreateConstituencyDto } from './dto/create-constituency.dto.js';
import { ListConstituenciesQueryDto } from './dto/list-constituencies-query.dto.js';
import { UpdateConstituencyDto } from './dto/update-constituency.dto.js';
import { UpdateConstituencyStatusDto } from './dto/update-constituency-status.dto.js';

@ApiTags('Constituencies')
@Controller('constituencies')
export class ConstituenciesController {
  constructor(private readonly constituencies: ConstituenciesService) {}

  @Get()
  @ApiOkResponse({ description: 'Public constituency identifiers and names.' })
  list() {
    return this.constituencies.list();
  }

  @Get('manage')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.AssignmentRead)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List constituencies for administration' })
  listManage(@Query() query: ListConstituenciesQueryDto) {
    return this.constituencies.listManage(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.AssignmentRead)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a constituency for administration' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.constituencies.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.AssignmentWrite)
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'Constituency created.' })
  create(@Body() dto: CreateConstituencyDto) {
    return this.constituencies.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.AssignmentWrite)
  @ApiBearerAuth()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateConstituencyDto) {
    return this.constituencies.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.AssignmentWrite)
  @ApiBearerAuth()
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateConstituencyStatusDto) {
    return this.constituencies.updateStatus(id, dto);
  }
}
