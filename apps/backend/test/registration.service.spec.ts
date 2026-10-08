import { BadRequestException, ConflictException, ValidationPipe } from '@nestjs/common';
import { OtpPurpose, Prisma, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, createHmac } from 'node:crypto';

import { AppConfigService } from '../src/config/app-config.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { EmailService } from '../src/email/email.service.js';
import { RegistrationService } from '../src/auth/registration.service.js';
import { RegisterUserDto } from '../src/auth/dto/register-user.dto.js';
import { ResetPasswordDto } from '../src/auth/dto/reset-password.dto.js';
import { ConstituenciesService } from '../src/constituencies/constituencies.service.js';

const userId = 'd7d897c4-7ec7-47ce-b515-40191feb2310';
const constituencyId = '8c7955c1-2c1a-48bc-b4bf-ace1e17d2a45';
const accessSecret = 'a'.repeat(40);

const transactionMock = {
  $queryRaw: jest.fn(),
  user: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  constituency: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  otp: {
    create: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  refreshToken: {
    updateMany: jest.fn(),
  },
};

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(
    async (callback: (transaction: typeof transactionMock) => Promise<unknown>) =>
      callback(transactionMock),
  ),
};

const emailMock = {
  sendRegistrationOtp: jest.fn(),
  sendPasswordResetOtp: jest.fn(),
};

const configMock = { accessTokenSecret: accessSecret };
const service = new RegistrationService(
  prismaMock as unknown as PrismaService,
  configMock as AppConfigService,
  emailMock as unknown as EmailService,
);
const constituenciesService = new ConstituenciesService(prismaMock as unknown as PrismaService);

const registrationDto = {
  displayName: 'Asha Reddy',
  email: 'asha@example.com',
  mobileNumber: '9876543210',
  password: 'correct horse battery staple',
  confirmPassword: 'correct horse battery staple',
  constituencyId,
};

function registrationOtpHash(otp: string) {
  return createHmac('sha256', configMock.accessTokenSecret)
    .update(`vasthav:registration-otp:${userId}:${otp}`)
    .digest('hex');
}

function passwordResetOtpHash(otp: string) {
  return createHmac('sha256', configMock.accessTokenSecret)
    .update(`vasthav:password-reset-otp:${userId}:${otp}`)
    .digest('hex');
}

function pendingUser() {
  return {
    id: userId,
    email: registrationDto.email,
    displayName: registrationDto.displayName,
    role: UserRole.USER,
    isActive: false,
    emailVerifiedAt: null,
  };
}

function verifiedUser() {
  return {
    ...pendingUser(),
    isActive: true,
    emailVerifiedAt: new Date(),
  };
}

function otpRecord(otp: string, overrides: Record<string, unknown> = {}) {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    userId,
    purpose: OtpPurpose.REGISTRATION,
    codeHash: registrationOtpHash(otp),
    expiresAt: new Date(Date.now() + 60_000),
    attemptCount: 0,
    verifiedAt: null,
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function passwordResetOtpRecord(otp: string, overrides: Record<string, unknown> = {}) {
  return {
    ...otpRecord(otp, { purpose: OtpPurpose.PASSWORD_RESET }),
    codeHash: passwordResetOtpHash(otp),
    ...overrides,
  };
}

describe('RegistrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(pendingUser());
    transactionMock.user.findFirst.mockResolvedValue(pendingUser());
    transactionMock.constituency.findUnique.mockResolvedValue({ id: constituencyId, isActive: true });
    transactionMock.constituency.update.mockResolvedValue({ id: constituencyId, isActive: false });
    prismaMock.$transaction.mockImplementation(
      async (callback: (transaction: typeof transactionMock) => Promise<unknown>) =>
        callback(transactionMock),
    );
    transactionMock.user.create.mockResolvedValue(pendingUser());
    transactionMock.otp.create.mockResolvedValue({ id: 'otp-id' });
    transactionMock.otp.findFirst.mockResolvedValue(otpRecord('123456'));
    transactionMock.otp.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.user.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    emailMock.sendRegistrationOtp.mockResolvedValue(undefined);
    emailMock.sendPasswordResetOtp.mockResolvedValue(undefined);
    transactionMock.otp.count.mockResolvedValue(0);
    transactionMock.$queryRaw.mockResolvedValue([]);
  });

  it('registers an inactive, unverified USER and never returns the OTP or password hash', async () => {
    const result = await service.register(registrationDto);
    const createCall = transactionMock.user.create.mock.calls[0][0];
    const otpCall = transactionMock.otp.create.mock.calls[0][0];
    const sentOtp = emailMock.sendRegistrationOtp.mock.calls[0][2] as string;

    expect(result).toMatchObject({ email: registrationDto.email });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('otp');
    expect(createCall.data).toMatchObject({
      role: UserRole.USER,
      isActive: false,
      emailVerifiedAt: null,
      mobileNumber: registrationDto.mobileNumber,
      constituencyId,
    });
    expect(createCall.data).not.toHaveProperty('confirmPassword');
    expect(otpCall.data).toMatchObject({
      userId,
      purpose: OtpPurpose.REGISTRATION,
      expiresAt: expect.any(Date),
    });
    expect(otpCall.data.codeHash).not.toBe(sentOtp);
    expect(sentOtp).toMatch(/^\d{6}$/);
    expect(otpCall.data).not.toHaveProperty('otp');
    expect(emailMock.sendRegistrationOtp).toHaveBeenCalledWith(
      registrationDto.email,
      registrationDto.displayName,
      sentOtp,
    );
  });

  it('rejects an existing email', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: userId });
    await expect(service.register(registrationDto)).rejects.toBeInstanceOf(ConflictException);
    expect(transactionMock.user.create).not.toHaveBeenCalled();
  });

  it('rejects an existing mobile number', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: userId });
    await expect(service.register(registrationDto)).rejects.toBeInstanceOf(ConflictException);
    expect(transactionMock.user.create).not.toHaveBeenCalled();
  });

  it('rejects a constituency that does not exist', async () => {
    transactionMock.constituency.findUnique.mockResolvedValue(null);
    await expect(service.register(registrationDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(transactionMock.user.create).not.toHaveBeenCalled();
  });

  it('rejects an inactive constituency during public registration', async () => {
    transactionMock.constituency.findUnique.mockResolvedValue({ id: constituencyId, isActive: false });
    await expect(service.register(registrationDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(transactionMock.user.create).not.toHaveBeenCalled();
  });

  it('waits for an in-flight deactivation and rejects registration after it commits', async () => {
    let constituencyIsActive = true;
    let rowLocked = false;
    const lockWaiters: Array<() => void> = [];
    let lockRequests = 0;
    let continueStatusRead!: () => void;
    let signalStatusLock!: () => void;
    let signalRegistrationWait!: () => void;
    let signalStatusRead!: () => void;
    const statusReadPaused = new Promise<void>((resolve) => { signalStatusRead = resolve; });
    const statusLockAcquired = new Promise<void>((resolve) => { signalStatusLock = resolve; });
    const registrationWaiting = new Promise<void>((resolve) => { signalRegistrationWait = resolve; });
    const resumeStatusRead = new Promise<void>((resolve) => { continueStatusRead = resolve; });

    const acquireRowLock = async () => {
      if (!rowLocked) {
        rowLocked = true;
        return;
      }
      await new Promise<void>((resolve) => lockWaiters.push(resolve));
    };
    const releaseRowLock = () => {
      const next = lockWaiters.shift();
      if (next) next();
      else rowLocked = false;
    };

    transactionMock.constituency.findUnique.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.isActive === true) {
        return constituencyIsActive ? { id: constituencyId, isActive: true } : null;
      }
      if (constituencyIsActive) {
        signalStatusRead();
        await resumeStatusRead;
      }
      return { id: constituencyId, isActive: constituencyIsActive, _count: { users: 0 } };
    });
    transactionMock.constituency.update.mockImplementation(async ({ data }: { data: { isActive: boolean } }) => {
      constituencyIsActive = data.isActive;
      return { id: constituencyId, isActive: constituencyIsActive };
    });
    prismaMock.$transaction.mockImplementation(async (callback: (transaction: typeof transactionMock) => Promise<unknown>) => {
      let acquired = false;
      const transaction = {
        ...transactionMock,
        $queryRaw: jest.fn(async () => {
          lockRequests += 1;
          if (lockRequests === 1) signalStatusLock();
          if (lockRequests === 2) signalRegistrationWait();
          await acquireRowLock();
          acquired = true;
          return [];
        }),
      };
      try {
        return await callback(transaction);
      } finally {
        if (acquired) releaseRowLock();
      }
    });

    const deactivation = constituenciesService.updateStatus(constituencyId, { isActive: false });
    await statusLockAcquired;
    await statusReadPaused;
    const registration = service.register(registrationDto);
    await registrationWaiting;
    continueStatusRead();

    await expect(deactivation).resolves.toMatchObject({ isActive: false });
    await expect(registration).rejects.toBeInstanceOf(BadRequestException);
    expect(transactionMock.user.create).not.toHaveBeenCalled();
    expect(transactionMock.constituency.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: constituencyId, isActive: true },
    }));
    expect(lockRequests).toBe(2);
  });

  it('rejects mismatched password confirmation', async () => {
    await expect(service.register({ ...registrationDto, confirmPassword: 'different password' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a client-supplied role field at request validation', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    await expect(pipe.transform(
      { ...registrationDto, role: 'ADMIN' },
      { type: 'body', metatype: RegisterUserDto, data: '' },
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it('verifies a valid registration OTP and activates the account', async () => {
    const record = otpRecord('123456');
    transactionMock.otp.findFirst.mockResolvedValue(record);

    await expect(service.verifyRegistrationOtp({ email: registrationDto.email, otp: '123456' }))
      .resolves.toEqual({ message: 'Email verified successfully. You can now log in.' });

    expect(record.codeHash).toBe(registrationOtpHash('123456'));
    expect(transactionMock.otp.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId,
        purpose: OtpPurpose.REGISTRATION,
        usedAt: null,
      }),
    }));

    expect(transactionMock.otp.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ usedAt: null, attemptCount: { lt: 5 } }),
      data: expect.objectContaining({ verifiedAt: expect.any(Date), usedAt: expect.any(Date) }),
    }));
    expect(transactionMock.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: userId, isActive: false, emailVerifiedAt: null }),
      data: expect.objectContaining({ isActive: true, emailVerifiedAt: expect.any(Date) }),
    }));
  });

  it('rejects an invalid OTP and increments the attempt count', async () => {
    const account = pendingUser();
    const record = otpRecord('123456');
    transactionMock.user.findFirst.mockResolvedValue(account);
    transactionMock.otp.findFirst.mockResolvedValue(record);
    await expect(service.verifyRegistrationOtp({ email: registrationDto.email, otp: '000000' }))
      .rejects.toThrow(new BadRequestException('Invalid or expired OTP'));
    expect(transactionMock.otp.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: record.id,
        usedAt: null,
        attemptCount: { lt: 5 },
        expiresAt: { gt: expect.any(Date) },
      }),
      data: { attemptCount: { increment: 1 } },
    }));
    expect(transactionMock.user.findFirst).toHaveBeenCalled();
    expect(transactionMock.user.updateMany).not.toHaveBeenCalled();
    expect(account).toMatchObject({ isActive: false, emailVerifiedAt: null });
  });

  it('rejects an expired OTP without activating the user', async () => {
    transactionMock.otp.findFirst.mockResolvedValue(
      otpRecord('123456', { expiresAt: new Date(Date.now() - 1) }),
    );
    await expect(service.verifyRegistrationOtp({ email: registrationDto.email, otp: '123456' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(transactionMock.user.updateMany).not.toHaveBeenCalled();
  });

  it('rejects OTPs after five failed attempts', async () => {
    transactionMock.otp.findFirst.mockResolvedValue(otpRecord('123456', { attemptCount: 5 }));
    await expect(service.verifyRegistrationOtp({ email: registrationDto.email, otp: '123456' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(transactionMock.otp.updateMany).not.toHaveBeenCalled();
    expect(transactionMock.user.updateMany).not.toHaveBeenCalled();
  });

  it('does not allow a used OTP to be reused', async () => {
    transactionMock.otp.findFirst.mockResolvedValue(null);
    await expect(service.verifyRegistrationOtp({ email: registrationDto.email, otp: '123456' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(transactionMock.user.updateMany).not.toHaveBeenCalled();
  });

  it('invalidates previous unused registration OTPs when resending', async () => {
    await expect(service.resendRegistrationOtp({ email: registrationDto.email }))
      .resolves.toMatchObject({ message: expect.stringContaining('If an unverified account exists') });
    expect(transactionMock.otp.updateMany).toHaveBeenCalledWith({
      where: { userId, purpose: OtpPurpose.REGISTRATION, usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(transactionMock.otp.create).toHaveBeenCalled();
    expect(emailMock.sendRegistrationOtp).toHaveBeenCalled();
  });

  it('requests a password reset with a hashed OTP and a generic response', async () => {
    prismaMock.user.findFirst.mockResolvedValue(verifiedUser());
    transactionMock.otp.findFirst.mockResolvedValue(null);
    const result = await service.requestPasswordReset(registrationDto.email);
    const createCall = transactionMock.otp.create.mock.calls[0][0];
    const sentOtp = emailMock.sendPasswordResetOtp.mock.calls[0][2] as string;

    expect(result.message).toBe('If an account exists for this email, a password reset code may be sent shortly.');
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ isActive: true, emailVerifiedAt: { not: null }, deletedAt: null }),
    }));
    expect(createCall.data).toMatchObject({ userId, purpose: OtpPurpose.PASSWORD_RESET });
    expect(createCall.data.codeHash).toBe(passwordResetOtpHash(sentOtp));
    expect(createCall.data.codeHash).not.toBe(sentOtp);
    expect(sentOtp).toMatch(/^\d{6}$/);
    expect(emailMock.sendPasswordResetOtp).toHaveBeenCalledWith(
      registrationDto.email,
      registrationDto.displayName,
      sentOtp,
    );
  });

  it('returns the same reset response for an unknown email without sending email', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(service.requestPasswordReset('missing@example.com')).resolves.toEqual({
      message: 'If an account exists for this email, a password reset code may be sent shortly.',
    });
    expect(transactionMock.otp.create).not.toHaveBeenCalled();
    expect(emailMock.sendPasswordResetOtp).not.toHaveBeenCalled();
  });

  it('keeps the reset response generic when email delivery fails', async () => {
    prismaMock.user.findFirst.mockResolvedValue(verifiedUser());
    transactionMock.otp.findFirst.mockResolvedValue(null);
    emailMock.sendPasswordResetOtp.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(service.requestPasswordReset(registrationDto.email)).resolves.toEqual({
      message: 'If an account exists for this email, a password reset code may be sent shortly.',
    });
  });

  it('enforces password reset resend cooldown and hourly request cap generically', async () => {
    prismaMock.user.findFirst.mockResolvedValue(verifiedUser());
    transactionMock.otp.findFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 10_000) });
    await expect(service.requestPasswordReset(registrationDto.email)).resolves.toMatchObject({
      message: expect.stringContaining('If an account exists'),
    });
    expect(transactionMock.otp.create).not.toHaveBeenCalled();

    transactionMock.otp.findFirst.mockResolvedValue(null);
    transactionMock.otp.count.mockResolvedValue(5);
    await expect(service.requestPasswordReset(registrationDto.email)).resolves.toMatchObject({
      message: expect.stringContaining('If an account exists'),
    });
    expect(transactionMock.otp.create).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('rejects a wrong password reset OTP and increments its attempt count', async () => {
    transactionMock.user.findFirst.mockResolvedValue(verifiedUser());
    const record = passwordResetOtpRecord('123456');
    transactionMock.otp.findFirst.mockResolvedValue(record);

    await expect(service.verifyPasswordResetOtp({ email: registrationDto.email, otp: '000000' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(transactionMock.otp.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: record.id, attemptCount: { lt: 5 } }),
      data: { attemptCount: { increment: 1 } },
    }));
  });

  it('rejects expired, exhausted, and already verified password reset OTPs', async () => {
    transactionMock.user.findFirst.mockResolvedValue(verifiedUser());
    for (const record of [
      passwordResetOtpRecord('123456', { expiresAt: new Date(Date.now() - 1) }),
      passwordResetOtpRecord('123456', { attemptCount: 5 }),
      passwordResetOtpRecord('123456', { verifiedAt: new Date() }),
    ]) {
      transactionMock.otp.findFirst.mockResolvedValue(
        record.verifiedAt === null && record.usedAt === null ? record : null,
      );
      await expect(service.verifyPasswordResetOtp({ email: registrationDto.email, otp: '123456' }))
        .rejects.toBeInstanceOf(BadRequestException);
    }
    expect(transactionMock.otp.updateMany).not.toHaveBeenCalled();
  });

  it('returns a one-time reset authorization only after verifying the OTP', async () => {
    transactionMock.user.findFirst.mockResolvedValue(verifiedUser());
    const record = passwordResetOtpRecord('123456');
    transactionMock.otp.findFirst.mockResolvedValue(record);

    const result = await service.verifyPasswordResetOtp({ email: registrationDto.email, otp: '123456' });
    expect(result).toMatchObject({ message: 'Verification successful. Set your new password.' });
    expect(result.resetToken).toMatch(/^[0-9a-f]{64}$/);
    expect(transactionMock.otp.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: record.id, verifiedAt: null, usedAt: null }),
      data: { verifiedAt: expect.any(Date), codeHash: createHash('sha256').update(result.resetToken).digest('hex') },
    }));
    expect(JSON.stringify(result)).not.toContain(record.codeHash);
  });

  it('rejects password reset without a verified authorization', async () => {
    transactionMock.otp.findFirst.mockResolvedValue(null);
    await expect(service.resetPassword({
      resetToken: 'a'.repeat(64),
      newPassword: 'new secure password value',
      confirmNewPassword: 'new secure password value',
    })).rejects.toThrow('Invalid or expired password reset authorization');
    expect(transactionMock.user.updateMany).not.toHaveBeenCalled();
    expect(transactionMock.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an expired or already consumed reset authorization', async () => {
    transactionMock.otp.findFirst.mockResolvedValue(null);
    await expect(service.resetPassword({
      resetToken: 'e'.repeat(64),
      newPassword: 'new secure password value',
      confirmNewPassword: 'new secure password value',
    })).rejects.toThrow('Invalid or expired password reset authorization');
    expect(transactionMock.otp.updateMany).not.toHaveBeenCalled();
    expect(transactionMock.user.updateMany).not.toHaveBeenCalled();
  });

  it('changes the password, consumes authorization, and revokes refresh sessions', async () => {
    const token = 'b'.repeat(64);
    const hash = createHash('sha256').update(token).digest('hex');
    transactionMock.otp.findFirst.mockResolvedValue({ id: 'reset-otp-id', userId });
    transactionMock.otp.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.resetPassword({
      resetToken: token,
      newPassword: 'new secure password value',
      confirmNewPassword: 'new secure password value',
    })).resolves.toMatchObject({ message: 'Password updated successfully. Please log in with your new password.' });

    const userUpdate = transactionMock.user.updateMany.mock.calls[0][0];
    expect(await bcrypt.compare('new secure password value', userUpdate.data.passwordHash)).toBe(true);
    expect(userUpdate.data.passwordHash).not.toBe('new secure password value');
    expect(transactionMock.otp.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'reset-otp-id', codeHash: hash, usedAt: null }),
      data: { usedAt: expect.any(Date) },
    }));
    expect(transactionMock.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    }));
    expect(transactionMock.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('allows only one of two concurrent uses of the same reset authorization', async () => {
    const token = 'f'.repeat(64);
    transactionMock.otp.findFirst.mockResolvedValue({ id: 'reset-otp-id', userId });
    transactionMock.otp.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const resetRequest = {
      resetToken: token,
      newPassword: 'new secure password value',
      confirmNewPassword: 'new secure password value',
    };

    const results = await Promise.allSettled([
      service.resetPassword(resetRequest),
      service.resetPassword(resetRequest),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(transactionMock.user.updateMany).toHaveBeenCalledTimes(1);
    expect(transactionMock.refreshToken.updateMany).toHaveBeenCalledTimes(1);
  });

  it('rejects password confirmation mismatch without consuming a reset authorization', async () => {
    await expect(service.resetPassword({
      resetToken: 'c'.repeat(64),
      newPassword: 'new secure password value',
      confirmNewPassword: 'different secure password value',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('validates reset token shape and password length at the request boundary', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    const transform = (body: unknown) => pipe.transform(body, {
      type: 'body',
      metatype: ResetPasswordDto,
      data: '',
    });
    await expect(transform({ resetToken: 'short', newPassword: 'new secure password value', confirmNewPassword: 'new secure password value' }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(transform({ resetToken: 'd'.repeat(64), newPassword: 'short', confirmNewPassword: 'short' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
