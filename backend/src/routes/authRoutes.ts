import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import {
  getUserProfile,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from '../services/authService.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  businessName: z.string().min(2, 'Business or Freelancer name is required'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(8, 'Reset token is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

authRouter.post('/register', async (request, response, next) => {
  try {
    const validatedInput = registerSchema.parse(request.body);
    const result = await registerUser(validatedInput);
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (request, response, next) => {
  try {
    const validatedInput = loginSchema.parse(request.body);
    const result = await loginUser(validatedInput);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/forgot-password', async (request, response, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(request.body);
    const result = await requestPasswordReset(email);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password', async (request, response, next) => {
  try {
    const { resetToken, newPassword } = resetPasswordSchema.parse(request.body);
    const result = await resetPasswordWithToken(resetToken, newPassword);
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

