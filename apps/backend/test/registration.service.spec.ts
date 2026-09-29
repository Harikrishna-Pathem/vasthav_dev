import { BadRequestException, ConflictException, ValidationPipe } from '@nestjs/common';
import { OtpPurpose, UserRole } from '@prisma/client';
import { createHmac } from 'node:crypto';

import { AppConfigService } from '../src/config/app-config.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { EmailService } from '../src/email/email.service.js';
import { RegistrationService } from '../src/auth/registration.service.js';
import { RegisterUserDto } from '../src/auth/dto/register-user.dto.js';

const userId = 'd7d897c4-7ec7-47ce-b515-40191feb2310';
const constituencyId = '8c7955c1-2c1a-48bc-b4bf-ace1e17d2a45';
const accessSecret = 'a'.repeat(40);

const transactionMock = {
  user: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  otp: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
};

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  constituency: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(
    async (callback: (transaction: typeof transactionMock) => Promise<unknown>) =>
      callback(transactionMock),
  ),
};

const emailMock = {
  sendRegistrationOtp: jest.fn(),
};

const configMock = { accessTokenSecret: accessSecret };
const service = new RegistrationService(
  prismaMock as unknown as PrismaService,
  configMock as AppConfigService,
  emailMock as unknown as EmailService,
);

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

describe('RegistrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(pendingUser());
    transactionMock.user.findFirst.mockResolvedValue(pendingUser());
    prismaMock.constituency.findUnique.mockResolvedValue({ id: constituencyId });
    prismaMock.$transaction.mockImplementation(
      async (callback: (transaction: typeof transactionMock) => Promise<unknown>) =>
        callback(transactionMock),
    );
    transactionMock.user.create.mockResolvedValue(pendingUser());
    transactionMock.otp.create.mockResolvedValue({ id: 'otp-id' });
    transactionMock.otp.findFirst.mockResolvedValue(otpRecord('123456'));
    transactionMock.otp.updateMany.mockResolvedValue({ count: 1 });
    transactionMock.user.updateMany.mockResolvedValue({ count: 1 });
    emailMock.sendRegistrationOtp.mockResolvedValue(undefined);
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
    prismaMock.constituency.findUnique.mockResolvedValue(null);
    await expect(service.register(registrationDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(transactionMock.user.create).not.toHaveBeenCalled();
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
});
