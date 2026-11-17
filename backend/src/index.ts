import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyDatabaseConnection } from './config/database.js';
import { env, isSimulationModeActive } from './config/env.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { authRouter } from './routes/authRoutes.js';
import { cryptoRouter } from './routes/cryptoRoutes.js';
import { invoiceRouter } from './routes/invoiceRoutes.js';
import { verificationRouter } from './routes/verificationRoutes.js';
import { startBackgroundVerificationWorkers } from './workers/verificationWorker.js';

export const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: [
      env.FRONTEND_URL,
      'https://paybridge.earthen.my.id',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4000',
    ],
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
    isSimulationEnabled: isSimulationModeActive(),
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

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDistDir = path.resolve(currentDir, '../../frontend/dist');

if (fs.existsSync(frontendDistDir)) {
  app.use(express.static(frontendDistDir));
  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api')) {
      next();
      return;
    }
    response.sendFile(path.join(frontendDistDir, 'index.html'));
  });
}

app.use(errorHandler);

async function bootstrapServer(): Promise<void> {
  if (env.PAYMENT_GATEWAY_MODE === 'MIDTRANS_PRODUCTION') {
    if (env.MIDTRANS_SERVER_KEY.includes('SAMPLE_KEY')) {
      throw new Error(
        'Cannot start in MIDTRANS_PRODUCTION mode with a sample MIDTRANS_SERVER_KEY.',
      );
    }
    if (env.JWT_SECRET.includes('change-in-production')) {
      throw new Error(
        'Cannot start in MIDTRANS_PRODUCTION mode with the default development JWT_SECRET.',
      );
    }
  }

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
