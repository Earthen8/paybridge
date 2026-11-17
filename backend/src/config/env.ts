import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  RESEND_API_KEY: z.string().optional().default(''),
  RESEND_FROM_EMAIL: z.string().default('PayBridge <onboarding@resend.dev>'),
  PAYMENT_GATEWAY_MODE: z
    .enum(['SIMULATOR', 'MIDTRANS_SANDBOX', 'MIDTRANS_PRODUCTION'])
    .default('SIMULATOR'),
  ENABLE_SIMULATION_MODE: z
    .string()
    .transform((value) => value === 'true')
    .default('true'),
  MIDTRANS_SERVER_KEY: z.string().default('SB-Mid-server-SAMPLE_KEY_FOR_TESTING'),
  MIDTRANS_CLIENT_KEY: z.string().default('SB-Mid-client-SAMPLE_KEY_FOR_TESTING'),
  MIDTRANS_MERCHANT_ID: z.string().default('G123456789'),
  COINGECKO_API_URL: z.string().url().default('https://api.coingecko.com/api/v3'),
  COINGECKO_API_KEY: z.string().optional().default(''),
  ENABLE_BACKGROUND_WORKERS: z
    .string()
    .transform((value) => value === 'true')
    .default('true'),
  POLLING_INTERVAL_SECONDS: z.coerce.number().default(30),
  RECONCILIATION_CRON: z.string().default('*/5 * * * *'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    'Failed to load environment configuration: invalid variables in .env file. Check backend/.env.example for required fields.',
    parsedEnv.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsedEnv.data;

export function isSimulationModeActive(): boolean {
  if (env.PAYMENT_GATEWAY_MODE === 'MIDTRANS_PRODUCTION') {
    return false;
  }
  return env.ENABLE_SIMULATION_MODE;
}
