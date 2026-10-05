import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  sendRegistrationOtp(to: string, displayName: string, otp: string) {
    return this.sendOtpEmail({
      to,
      displayName,
      otp,
      subject: 'Verify your VASTHAV account',
      heading: 'Welcome to VASTHAV',
      instructions: 'Use this verification code to activate your account.',
    });
  }

  sendPasswordResetOtp(to: string, displayName: string, otp: string) {
    return this.sendOtpEmail({
      to,
      displayName,
      otp,
      subject: 'Reset your VASTHAV password',
      heading: 'Password reset requested',
      instructions: 'Use this verification code to reset your password.',
    });
  }

  private async sendOtpEmail({
    to,
    displayName,
    otp,
    subject,
    heading,
    instructions,
  }: {
    to: string;
    displayName: string;
    otp: string;
    subject: string;
    heading: string;
    instructions: string;
  }) {
    const host = this.config.get<string>('mail.host');
    const user = this.config.get<string>('mail.user');
    const password = this.config.get<string>('mail.password');
    const from = this.config.get<string>('mail.from');

    if (!host || !user || !password || !from) {
      throw new ServiceUnavailableException('Email delivery is not configured');
    }

    const transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('mail.port') ?? 587,
      secure: this.config.get<boolean>('mail.secure') ?? false,
      auth: { user, pass: password },
    });
    const safeName = this.escapeHtml(displayName);

    await transporter.sendMail({
      from,
      to,
      subject,
      text: `${heading}\n\nHello ${displayName},\n\n${instructions}\n\n${otp}\n\nThis code expires in 10 minutes. If you did not request it, you can ignore this email.`,
      html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:560px;margin:32px auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">
      <p style="margin:0;color:#007943;font-size:12px;font-weight:bold;letter-spacing:2px">VASTHAV</p>
      <h1 style="margin:20px 0 8px;font-size:24px">${heading}</h1>
      <p style="margin:0 0 16px;color:#475569">Hello ${safeName}, ${instructions}</p>
      <div style="padding:18px;text-align:center;background:#ecfdf5;border-radius:12px;color:#007943;font-size:30px;font-weight:bold;letter-spacing:8px">${otp}</div>
      <p style="margin:18px 0 0;color:#64748b;font-size:14px">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    </div>
  </body>
</html>`,
    });
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character];
    });
  }
}
