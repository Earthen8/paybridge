import cors from 'cors';
import express from 'express';
import { verifyDatabaseConnection } from './config/database.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { authRouter } from './routes/authRoutes.js';
import { cryptoRouter } from './routes/cryptoRoutes.js';
import { invoiceRouter } from './routes/invoiceRoutes.js';
import { verificationRouter } from './routes/verificationRoutes.js';
import { startBackgroundVerificationWorkers } from './workers/verificationWorker.js';

export const app = express();

app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
);
app.use(express.json());

app.get('/api/health', async (_request, response) => {
  const isDatabaseConnected = await verifyDatabaseConnection();
  response.json({
    status: isDatabaseConnected ? 'healthy' : 'degraded',
    service: 'paybridge-backend',
    gatewayMode: env.PAYMENT_GATEWAY_MODE,
    isDatabaseConnected,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/crypto', cryptoRouter);

// Direct webhook alias for Midtrans Notification URL configuration (ngrok / Cloudflare Tunnel)
app.use('/api', verificationRouter);

app.use(errorHandler);

async function bootstrapServer(): Promise<void> {
  await verifyDatabaseConnection();
  startBackgroundVerificationWorkers();

  app.listen(env.PORT, () => {
    console.log(`[PayBridge Backend] Running on http://localhost:${env.PORT}`);
    console.log(`[PayBridge Webhook] Midtrans Notification URL: /api/webhooks/midtrans`);
  });
}

bootstrapServer().catch((error) => {
  console.error('[Fatal Startup Error]', error);
  process.exit(1);
});

