import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, OtpPurpose, UserRole } from '@prisma/client';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

import { AppConfigService } from '../config/app-config.service.js';
import { EmailService } from '../email/email.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ResendRegistrationOtpDto } from './dto/resend-registration-otp.dto.js';
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto.js';

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const PASSWORD_RESET_OTP_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_OTP_WINDOW_MS = 60 * 60 * 1000;
const MAX_PASSWORD_RESET_OTP_REQUESTS_PER_WINDOW = 5;
const REGISTRATION_OTP_MESSAGE = 'If an unverified account exists for this email, a verification code has been sent.';
const PASSWORD_RESET_MESSAGE = 'If an account exists for this email, a password reset code may be sent shortly.';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly email: EmailService,
  ) {}

  async register(dto: RegisterUserDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const email = dto.email.trim().toLowerCase();
    const mobileNumber = dto.mobileNumber.trim();
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    const existingMobile = await this.prisma.user.findUnique({
      where: { mobileNumber },
      select: { id: true },
    });
    if (existingEmail || existingMobile) {
      throw new ConflictException('Email or mobile number is already registered');
    }

    const constituency = await this.prisma.constituency.findUnique({
      where: { id: dto.constituencyId },
      select: { id: true },
    });
    if (!constituency) {
      throw new BadRequestException('Select a valid constituency');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const otp = this.generateOtp();
    let user: { id: string; email: string; displayName: string };

    try {
      user = await this.prisma.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            displayName: dto.displayName.trim(),
            email,
            mobileNumber,
            passwordHash,
            constituencyId: constituency.id,
            role: UserRole.USER,
            isActive: false,
            emailVerifiedAt: null,
          },
          select: { id: true, email: true, displayName: true },
        });

        await this.createRegistrationOtp(transaction, createdUser.id, otp);
        return createdUser;
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email or mobile number is already registered');
      }
      throw error;
    }

    try {
      await this.email.sendRegistrationOtp(user.email, user.displayName, otp);
    } catch {
      throw new ServiceUnavailableException(
        'We could not send the verification email. Please try again later.',
      );
    }

    return {
      message: 'Registration started. Check your email for a verification code.',
      email: user.email,
    };
  }

  async resendRegistrationOtp(dto: ResendRegistrationOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (
      !user
      || user.role !== UserRole.USER
      || user.isActive
      || user.emailVerifiedAt !== null
    ) {
      return { message: REGISTRATION_OTP_MESSAGE };
    }

    const otp = this.generateOtp();
    await this.prisma.$transaction((transaction) =>
      this.createRegistrationOtp(transaction, user.id, otp),
    );

    try {
      await this.email.sendRegistrationOtp(user.email, user.displayName, otp);
    } catch {
      throw new ServiceUnavailableException(
        'We could not send the verification email. Please try again later.',
      );
    }

    return { message: REGISTRATION_OTP_MESSAGE };
  }

  async verifyRegistrationOtp(dto: VerifyRegistrationOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const now = new Date();
    const verified = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findFirst({
        where: { email, deletedAt: null },
        select: {
          id: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
        },
      });

      if (
        !user
        || user.role !== UserRole.USER
        || user.isActive
        || user.emailVerifiedAt !== null
      ) {
        return false;
      }

      const otpRecord = await transaction.otp.findFirst({
        where: {
          userId: user.id,
          purpose: OtpPurpose.REGISTRATION,
          usedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (
        !otpRecord
        || otpRecord.expiresAt <= now
        || otpRecord.attemptCount >= MAX_OTP_ATTEMPTS
      ) {
        return false;
      }

      const expectedHash = this.hashOtp(user.id, dto.otp);
      if (!this.hashesMatch(otpRecord.codeHash, expectedHash)) {
        await transaction.otp.updateMany({
          where: {
            id: otpRecord.id,
            usedAt: null,
            attemptCount: { lt: MAX_OTP_ATTEMPTS },
            expiresAt: { gt: now },
          },
          data: { attemptCount: { increment: 1 } },
        });
        return false;
      }

      const usedOtp = await transaction.otp.updateMany({
        where: {
          id: otpRecord.id,
          codeHash: otpRecord.codeHash,
          usedAt: null,
          attemptCount: { lt: MAX_OTP_ATTEMPTS },
          expiresAt: { gt: now },
        },
        data: { verifiedAt: now, usedAt: now },
      });
      if (usedOtp.count !== 1) return false;

      const activatedUser = await transaction.user.updateMany({
        where: {
          id: user.id,
          role: UserRole.USER,
          isActive: false,
          emailVerifiedAt: null,
          deletedAt: null,
        },
        data: { isActive: true, emailVerifiedAt: now },
      });
      if (activatedUser.count !== 1) {
        throw new BadRequestException('Invalid or expired OTP');
      }

      return true;
    });

    if (!verified) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async requestPasswordReset(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null, isActive: true, emailVerifiedAt: { not: null } },
      select: { id: true, email: true, displayName: true },
    });
    if (!user) return { message: PASSWORD_RESET_MESSAGE };

    const now = new Date();
    const windowStart = new Date(now.getTime() - PASSWORD_RESET_OTP_WINDOW_MS);
    const otp = this.generateOtp();
    let created: boolean;
    try {
      created = await this.prisma.$transaction(async (transaction) => {
        const [recentCount, latestOtp] = await Promise.all([
          transaction.otp.count({
            where: { userId: user.id, purpose: OtpPurpose.PASSWORD_RESET, createdAt: { gte: windowStart } },
          }),
          transaction.otp.findFirst({
            where: { userId: user.id, purpose: OtpPurpose.PASSWORD_RESET },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
        ]);
        if (
          recentCount >= MAX_PASSWORD_RESET_OTP_REQUESTS_PER_WINDOW
          || (latestOtp && now.getTime() - latestOtp.createdAt.getTime() < PASSWORD_RESET_OTP_COOLDOWN_MS)
        ) return false;

        await transaction.otp.updateMany({
          where: { userId: user.id, purpose: OtpPurpose.PASSWORD_RESET, usedAt: null },
          data: { usedAt: now },
        });
        await transaction.otp.create({
          data: {
            userId: user.id,
            purpose: OtpPurpose.PASSWORD_RESET,
            codeHash: this.hashOtp(user.id, otp, OtpPurpose.PASSWORD_RESET),
            expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
          },
          select: { id: true },
        });
        return true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        return { message: PASSWORD_RESET_MESSAGE };
      }
      throw error;
    }
    if (!created) return { message: PASSWORD_RESET_MESSAGE };

    try {
      await this.email.sendPasswordResetOtp(user.email, user.displayName, otp);
    } catch {
      // Keep the response identical for unknown accounts and delivery failures.
    }

    return { message: PASSWORD_RESET_MESSAGE };
  }

  async verifyPasswordResetOtp(dto: VerifyRegistrationOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = this.hashResetToken(resetToken);
    const now = new Date();

    const verified = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findFirst({
        where: { email, deletedAt: null, isActive: true, emailVerifiedAt: { not: null } },
        select: { id: true },
      });
      if (!user) return false;

      const otpRecord = await transaction.otp.findFirst({
        where: {
          userId: user.id,
          purpose: OtpPurpose.PASSWORD_RESET,
          verifiedAt: null,
          usedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (
        !otpRecord
        || otpRecord.expiresAt <= now
        || otpRecord.attemptCount >= MAX_OTP_ATTEMPTS
      ) return false;

      const expectedHash = this.hashOtp(user.id, dto.otp, OtpPurpose.PASSWORD_RESET);
      if (!this.hashesMatch(otpRecord.codeHash, expectedHash)) {
        await transaction.otp.updateMany({
          where: {
            id: otpRecord.id,
            codeHash: otpRecord.codeHash,
            verifiedAt: null,
            usedAt: null,
            attemptCount: { lt: MAX_OTP_ATTEMPTS },
            expiresAt: { gt: now },
          },
          data: { attemptCount: { increment: 1 } },
        });
        return false;
      }

      const result = await transaction.otp.updateMany({
        where: {
          id: otpRecord.id,
          codeHash: otpRecord.codeHash,
          verifiedAt: null,
          usedAt: null,
          attemptCount: { lt: MAX_OTP_ATTEMPTS },
          expiresAt: { gt: now },
        },
        data: { verifiedAt: now, codeHash: resetTokenHash },
      });
      return result.count === 1;
    });

    if (!verified) throw new BadRequestException('Invalid or expired OTP');
    return { message: 'Verification successful. Set your new password.', resetToken };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const resetTokenHash = this.hashResetToken(dto.resetToken);
    const now = new Date();
    const reset = await this.prisma.$transaction(async (transaction) => {
      const authorization = await transaction.otp.findFirst({
        where: {
          codeHash: resetTokenHash,
          purpose: OtpPurpose.PASSWORD_RESET,
          verifiedAt: { not: null },
          usedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true, userId: true },
      });
      if (!authorization) return false;

      // Serialize against refresh rotation so a new session cannot be created
      // after this reset has revoked all of the user's existing sessions.
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM users WHERE id = ${authorization.userId}::uuid FOR UPDATE
      `;

      const consumed = await transaction.otp.updateMany({
        where: {
          id: authorization.id,
          codeHash: resetTokenHash,
          purpose: OtpPurpose.PASSWORD_RESET,
          verifiedAt: { not: null },
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) return false;

      const updatedUser = await transaction.user.updateMany({
        where: {
          id: authorization.userId,
          deletedAt: null,
          isActive: true,
          emailVerifiedAt: { not: null },
        },
        data: { passwordHash },
      });
      if (updatedUser.count !== 1) {
        throw new BadRequestException('Invalid or expired password reset authorization');
      }

      await transaction.refreshToken.updateMany({
        where: { userId: authorization.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      return true;
    });

    if (!reset) throw new BadRequestException('Invalid or expired password reset authorization');
    return { message: 'Password updated successfully. Please log in with your new password.' };
  }

  private async createRegistrationOtp(
    transaction: Prisma.TransactionClient,
    userId: string,
    otp: string,
  ) {
    const now = new Date();
    await transaction.otp.updateMany({
      where: {
        userId,
        purpose: OtpPurpose.REGISTRATION,
        usedAt: null,
      },
      data: { usedAt: now },
    });

    return transaction.otp.create({
      data: {
        userId,
        purpose: OtpPurpose.REGISTRATION,
        codeHash: this.hashOtp(userId, otp),
        expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
      },
      select: { id: true },
    });
  }

  private generateOtp() {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private hashOtp(userId: string, otp: string, purpose: OtpPurpose = OtpPurpose.REGISTRATION) {
    const purposeLabel = purpose === OtpPurpose.PASSWORD_RESET ? 'password-reset' : 'registration';
    return createHmac('sha256', this.config.accessTokenSecret)
      .update(`vasthav:${purposeLabel}-otp:${userId}:${otp}`)
      .digest('hex');
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashesMatch(stored: string, expected: string) {
    const storedBytes = Buffer.from(stored, 'hex');
    const expectedBytes = Buffer.from(expected, 'hex');
    return storedBytes.length === expectedBytes.length
      && timingSafeEqual(storedBytes, expectedBytes);
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002';
  }
}
