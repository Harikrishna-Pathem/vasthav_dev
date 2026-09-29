import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { ResendRegistrationOtpDto } from './dto/resend-registration-otp.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { AuthenticatedUser } from './auth.types.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RegistrationService } from './registration.service.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly registration: RegistrationService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a USER account and send an email verification code' })
  register(@Body() dto: RegisterUserDto) {
    return this.registration.register(dto);
  }

  @Public()
  @Post('register/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a registration email code and activate the account' })
  verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto) {
    return this.registration.verifyRegistrationOtp(dto);
  }

  @Public()
  @Post('register/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend a registration email verification code' })
  resendRegistrationOtp(@Body() dto: ResendRegistrationOtpDto) {
    return this.registration.resendRegistrationOtp(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a user and issue an access/refresh token pair' })
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token and issue a new token pair' })
  refresh(@Body() dto: RefreshTokenDto) { return this.auth.refresh(dto.refreshToken); }
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> { await this.auth.logout(dto.refreshToken); }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Current authenticated user.' })
  me(@CurrentUser() user: AuthenticatedUser) { return { id: user.id, email: user.email, role: user.role }; }
}
