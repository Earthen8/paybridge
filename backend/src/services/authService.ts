import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/appError.js';
import { generateRandomHexToken, signAuthToken } from '../utils/tokenUtils.js';

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
  businessName: string;
  phone?: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export async function registerUser(input: RegisterUserInput) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError(
      `Registration failed because email "${normalizedEmail}" is already registered.`,
      409,
      'EMAIL_ALREADY_EXISTS',
      'Sign in with the existing account or use a different email address.',
    );
  }

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
      'Login failed because no account matches the provided email and password.',
      401,
      'INVALID_CREDENTIALS',
      'Check your email and password or register a new account.',
    );
  }

  const isPasswordMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordMatch) {
    throw new AppError(
      'Login failed because no account matches the provided email and password.',
      401,
      'INVALID_CREDENTIALS',
      'Check your email and password or use password reset.',
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
      `Password reset failed because email "${normalizedEmail}" was not found.`,
      404,
      'USER_NOT_FOUND',
      'Verify the registered email address and try again.',
    );
  }

  const resetToken = generateRandomHexToken(16);
  const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiresAt },
  });

  return {
    email: user.email,
    resetToken,
    expiresAt: resetTokenExpiresAt.toISOString(),
  };
}

export async function resetPasswordWithToken(resetToken: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: {
      resetToken,
      resetTokenExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError(
      'Password reset failed because the reset token is invalid or has expired.',
      400,
      'INVALID_RESET_TOKEN',
      'Request a new password reset token and complete the reset within 30 minutes.',
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
  });

  return { message: 'Password has been updated successfully.' };
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(
      'Profile lookup failed because the user account no longer exists.',
      404,
      'USER_NOT_FOUND',
      'Sign in again with a valid account.',
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

