import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service.js';
import { EmailModule } from '../email/email.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RegistrationService } from './registration.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';

@Module({
  imports: [JwtModule.register({}), EmailModule],
  controllers: [AuthController],
  providers: [AuthService, RegistrationService, AppConfigService, JwtAuthGuard, RolesGuard, PermissionsGuard],
  exports: [JwtModule, AppConfigService, JwtAuthGuard, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
