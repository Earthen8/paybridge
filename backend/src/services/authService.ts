import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/appError.js';
import { generateSixDigitOtp, signAuthToken } from '../utils/tokenUtils.js';
import { sendOtpEmail } from './emailService.js';

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
  businessName: string;
  phone?: string;
  otpCode: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

interface PendingOtpEntry {
  otpCode: string;
  expiresAtMs: number;
}

const pendingRegistrationOtps = new Map<string, PendingOtpEntry>();
const OTP_TTL_MS = 15 * 60 * 1000;

export async function requestRegistrationOtp(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError(
      `Pendaftaran gagal karena email "${normalizedEmail}" sudah terdaftar.`,
      409,
      'EMAIL_ALREADY_EXISTS',
      'Masuk menggunakan akun yang sudah ada atau gunakan alamat email lain.',
    );
  }

  const otpCode = generateSixDigitOtp();
  const expiresAtMs = Date.now() + OTP_TTL_MS;
  pendingRegistrationOtps.set(normalizedEmail, { otpCode, expiresAtMs });

  const delivery = await sendOtpEmail({
    toEmail: normalizedEmail,
    otpCode,
    purpose: 'REGISTER_VERIFY',
  });

  return {
    email: normalizedEmail,
    expiresAt: new Date(expiresAtMs).toISOString(),
    ...delivery,
  };
}

export async function registerUser(input: RegisterUserInput) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const pendingOtp = pendingRegistrationOtps.get(normalizedEmail);

  if (!pendingOtp || Date.now() > pendingOtp.expiresAtMs || pendingOtp.otpCode !== input.otpCode.trim()) {
    throw new AppError(
      'Kode OTP verifikasi pendaftaran tidak valid atau sudah kedaluwarsa.',
      400,
      'INVALID_REGISTRATION_OTP',
      'Minta kode OTP baru ke email Anda lalu masukkan 6 digit kode tersebut.',
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError(
      `Pendaftaran gagal karena email "${normalizedEmail}" sudah terdaftar.`,
      409,
      'EMAIL_ALREADY_EXISTS',
      'Masuk menggunakan akun yang sudah ada.',
    );
  }

  pendingRegistrationOtps.delete(normalizedEmail);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const createdUser = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      businessName: input.businessName.trim(),
      phone: input.phone?.trim(),
    },
  });

  const token = signAuthToken({ userId: createdUser.id, email: createdUser.email });
  return { token, user: sanitizeUser(createdUser) };
}

export async function loginUser(input: LoginUserInput) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw new AppError(
      'Email atau kata sandi tidak sesuai.',
      401,
      'INVALID_CREDENTIALS',
      'Periksa kembali email dan kata sandi Anda.',
    );
  }

  const isPasswordMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordMatch) {
    throw new AppError(
      'Email atau kata sandi tidak sesuai.',
      401,
      'INVALID_CREDENTIALS',
      'Periksa kembali email dan kata sandi atau gunakan fitur Reset Sandi.',
    );
  }

  const token = signAuthToken({ userId: user.id, email: user.email });
  return { token, user: sanitizeUser(user) };
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw new AppError(
      `Akun dengan email "${normalizedEmail}" tidak ditemukan.`,
      404,
      'USER_NOT_FOUND',
      'Pastikan alamat email yang dimasukkan sudah terdaftar di PayBridge.',
    );
  }

  const otpCode = generateSixDigitOtp();
  const resetTokenExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: otpCode, resetTokenExpiresAt },
  });

  const delivery = await sendOtpEmail({
    toEmail: user.email,
    otpCode,
    purpose: 'PASSWORD_RESET',
  });

  return {
    email: user.email,
    expiresAt: resetTokenExpiresAt.toISOString(),
    ...delivery,
  };
}

export async function resetPasswordWithToken(
  email: string,
  otpCode: string,
  newPassword: string,
) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      resetToken: otpCode.trim(),
      resetTokenExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError(
      'Kode OTP reset sandi tidak valid atau sudah kedaluwarsa.',
      400,
      'INVALID_RESET_TOKEN',
      'Minta kode OTP baru dan selesaikan perubahan sandi dalam waktu 15 menit.',
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
  });

  return { message: 'Kata sandi berhasil diperbarui. Silakan masuk dengan sandi baru.' };
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      'Profil pengguna tidak ditemukan.',
      404,
      'USER_NOT_FOUND',
      'Silakan masuk kembali.',
    );
  }
  return sanitizeUser(user);
}

function sanitizeUser(user: {
  id: string;
  name: string;
  email: string;
  businessName: string;
  phone: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    businessName: user.businessName,
    phone: user.phone,
    createdAt: user.createdAt,
  };
}
