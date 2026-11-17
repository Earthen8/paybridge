import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { createRateLimiter } from '../middleware/rateLimitMiddleware.js';
import {
  getUserProfile,
  loginUser,
  registerUser,
  requestPasswordReset,
  requestRegistrationOtp,
  resetPasswordWithToken,
} from '../services/authService.js';

export const authRouter = Router();

const otpRequestLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  message: 'Terlalu banyak permintaan pengiriman OTP dari alamat IP ini.',
});

const authAttemptLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Terlalu banyak percobaan autentikasi dari alamat IP ini.',
});

const emailOnlySchema = z.object({
  email: z.string().email('Alamat email yang valid wajib diisi'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Alamat email yang valid wajib diisi'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
  businessName: z.string().min(2, 'Nama bisnis atau studio wajib diisi'),
  phone: z.string().optional(),
  otpCode: z.string().length(6, 'Kode OTP harus 6 digit angka'),
});

const loginSchema = z.object({
  email: z.string().email('Alamat email yang valid wajib diisi'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Alamat email yang valid wajib diisi'),
  otpCode: z.string().length(6, 'Kode OTP harus 6 digit angka'),
  newPassword: z.string().min(6, 'Kata sandi baru minimal 6 karakter'),
});

authRouter.post('/send-register-otp', otpRequestLimiter, async (request, response, next) => {
  try {
    const { email } = emailOnlySchema.parse(request.body);
    const result = await requestRegistrationOtp(email);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/register', authAttemptLimiter, async (request, response, next) => {
  try {
    const validatedInput = registerSchema.parse(request.body);
    const result = await registerUser(validatedInput);
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', authAttemptLimiter, async (request, response, next) => {
  try {
    const validatedInput = loginSchema.parse(request.body);
    const result = await loginUser(validatedInput);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/forgot-password', otpRequestLimiter, async (request, response, next) => {
  try {
    const { email } = emailOnlySchema.parse(request.body);
    const result = await requestPasswordReset(email);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password', authAttemptLimiter, async (request, response, next) => {
  try {
    const { email, otpCode, newPassword } = resetPasswordSchema.parse(request.body);
    const result = await resetPasswordWithToken(email, otpCode, newPassword);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const profile = await getUserProfile(request.user!.userId);
    response.json({ user: profile });
  } catch (error) {
    next(error);
  }
});
