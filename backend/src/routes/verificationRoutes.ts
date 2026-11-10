import { SimulationScenario } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import {
  runResearchBenchmarkSimulation,
  simulateTransactionPaymentScenario,
} from '../services/simulationService.js';
import {
  getSystemReliabilityReport,
  pollTransactionStatus,
  processMidtransWebhook,
  runTransactionReconciliation,
} from '../services/verificationService.js';

export const verificationRouter = Router();

const midtransWebhookSchema = z.object({
  order_id: z.string().min(1, 'order_id is required'),
  transaction_id: z.string().optional(),
  transaction_status: z.string().min(1, 'transaction_status is required'),
  status_code: z.string().default('200'),
  gross_amount: z.string().min(1, 'gross_amount is required'),
  signature_key: z.string().min(1, 'signature_key is required'),
  settlement_time: z.string().optional(),
});

const singleSimulationSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  scenario: z.enum(['NORMAL', 'DELAYED_WEBHOOK', 'FAILED_WEBHOOK', 'DUPLICATE_WEBHOOK']),
  delayMs: z.coerce.number().int().min(500).max(60000).optional(),
  duplicateCount: z.coerce.number().int().min(2).max(10).optional(),
  autoRecoverWithPolling: z.boolean().optional(),
});

const batchBenchmarkSchema = z.object({
  scenario: z.nativeEnum(SimulationScenario),
  sampleSize: z.coerce.number().int().min(3).max(50).default(10),
  webhookDelayMs: z.coerce.number().int().min(500).max(60000).optional(),
  duplicateFactor: z.coerce.number().int().min(2).max(10).optional(),
});

verificationRouter.post('/webhooks/midtrans', async (request, response, next) => {
  try {
    const validatedPayload = midtransWebhookSchema.parse(request.body);
    const result = await processMidtransWebhook(validatedPayload);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

verificationRouter.post('/poll/:orderId', async (request, response, next) => {
  try {
    const result = await pollTransactionStatus(String(request.params.orderId));
    response.json(result);
  } catch (error) {
    next(error);
  }
});

verificationRouter.post('/reconcile', requireAuth, async (_request, response, next) => {
  try {
    const result = await runTransactionReconciliation();
    response.json(result);
  } catch (error) {
    next(error);
  }
});

verificationRouter.post('/simulate-payment', async (request, response, next) => {
  try {
    const validatedInput = singleSimulationSchema.parse(request.body);
    const result = await simulateTransactionPaymentScenario(validatedInput);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

verificationRouter.post(
  '/simulate-benchmark',
  requireAuth,
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const validatedInput = batchBenchmarkSchema.parse(request.body);
      const result = await runResearchBenchmarkSimulation({
        ...validatedInput,
        userId: request.user!.userId,
      });
      response.status(201).json({ simulationRun: result });
    } catch (error) {
      next(error);
    }
  },
);

verificationRouter.get('/reliability-report', requireAuth, async (_request, response, next) => {
  try {
    const report = await getSystemReliabilityReport();
    response.json(report);
  } catch (error) {
    next(error);
  }
});

verificationRouter.get('/audit-logs', requireAuth, async (request, response, next) => {
  try {
    const mechanismFilter =
      typeof request.query.mechanism === 'string' && request.query.mechanism !== 'ALL'
        ? request.query.mechanism
        : undefined;

    const [auditLogs, webhookEvents] = await Promise.all([
      prisma.auditLog.findMany({
        where: mechanismFilter ? { mechanism: mechanismFilter as never } : {},
        include: {
          invoice: { select: { invoiceNumber: true, clientName: true, amountIdr: true } },
          transaction: { select: { orderId: true, status: true, verifiedBy: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.webhookEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    response.json({ auditLogs, webhookEvents });
  } catch (error) {
    next(error);
  }
});

