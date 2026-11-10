import cron from 'node-cron';
import { GatewayTransactionStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import {
  pollTransactionStatus,
  runTransactionReconciliation,
} from '../services/verificationService.js';

let pollingTimerId: NodeJS.Timeout | null = null;

export function startBackgroundVerificationWorkers(): void {
  if (!env.ENABLE_BACKGROUND_WORKERS) {
    return;
  }

  const intervalMs = Math.max(10, env.POLLING_INTERVAL_SECONDS) * 1000;
  pollingTimerId = setInterval(() => {
    pollPendingTransactionsBatch().catch(() => {
      // Background polling cycle skipped when database is offline
    });
  }, intervalMs);

  cron.schedule(env.RECONCILIATION_CRON, () => {
    runTransactionReconciliation().catch(() => {
      // Scheduled reconciliation skipped when database is offline
    });
  });

  console.log(
    `[Workers] Active polling every ${env.POLLING_INTERVAL_SECONDS}s & Reconciliation cron (${env.RECONCILIATION_CRON}) initialized.`,
  );
}

export function stopBackgroundVerificationWorkers(): void {
  if (pollingTimerId) {
    clearInterval(pollingTimerId);
    pollingTimerId = null;
  }
}

async function pollPendingTransactionsBatch(): Promise<void> {
  const pendingTransactions = await prisma.paymentTransaction.findMany({
    where: {
      status: GatewayTransactionStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    take: 20,
  });

  for (const transaction of pendingTransactions) {
    await pollTransactionStatus(transaction.orderId);
  }
}

