import {
  GatewayTransactionStatus,
  InvoiceStatus,
  SimulationScenario,
  VerificationMechanism,
} from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/appError.js';
import { createMidtransSignature, generateRandomHexToken } from '../utils/tokenUtils.js';
import { fetchGatewayTransactionStatus, mapMidtransStatusToEnum } from './midtransService.js';

export interface MidtransWebhookPayload {
  order_id: string;
  transaction_id?: string;
  transaction_status: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  settlement_time?: string;
  scenario?: SimulationScenario;
}

export async function processMidtransWebhook(payload: MidtransWebhookPayload) {
  const startedAtMs = Date.now();
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { orderId: payload.order_id },
    include: { invoice: true },
  });

  if (!transaction) {
    throw new AppError(
      `Webhook processing failed because Order ID "${payload.order_id}" was not found.`,
      404,
      'TRANSACTION_NOT_FOUND',
      'Verify that the order_id in the webhook payload exists in PayBridge.',
    );
  }

  const expectedSignature = createMidtransSignature(
    payload.order_id,
    payload.status_code,
    payload.gross_amount,
  );
  const isSignatureValid = payload.signature_key === expectedSignature;

  if (!isSignatureValid) {
    return recordRejectedWebhook(transaction.id, transaction.invoiceId, payload, startedAtMs);
  }

  const existingProcessedWebhook = await prisma.webhookEvent.findFirst({
    where: {
      orderId: payload.order_id,
      transactionStatus: payload.transaction_status,
      isSignatureValid: true,
      isDuplicate: false,
    },
  });

  if (existingProcessedWebhook || transaction.status === GatewayTransactionStatus.SETTLEMENT) {
    return recordDuplicateWebhook(transaction.id, transaction.invoiceId, payload, startedAtMs);
  }

  return applyValidWebhookTransition(transaction, payload, startedAtMs);
}

async function recordRejectedWebhook(
  transactionId: string,
  invoiceId: string,
  payload: MidtransWebhookPayload,
  startedAtMs: number,
): Promise<never> {
  const processingTimeMs = Date.now() - startedAtMs;
  await prisma.webhookEvent.create({
    data: {
      transactionId,
      orderId: payload.order_id,
      gatewayTransactionId: payload.transaction_id,
      idempotencyKey: `invalid-${payload.order_id}-${generateRandomHexToken(6)}`,
      transactionStatus: payload.transaction_status,
      signatureKey: payload.signature_key,
      isSignatureValid: false,
      isDuplicate: false,
      scenario: payload.scenario ?? SimulationScenario.NORMAL,
      processingTimeMs,
      rawPayload: payload as object,
    },
  });

  await prisma.auditLog.create({
    data: {
      invoiceId,
      transactionId,
      mechanism: VerificationMechanism.WEBHOOK,
      action: 'WEBHOOK_SIGNATURE_REJECTED',
      isSuccess: false,
      latencyMs: processingTimeMs,
      message: `Rejected webhook for ${payload.order_id}: invalid SHA-512 signature.`,
    },
  });

  throw new AppError(
    'Webhook verification failed because signature_key does not match expected SHA-512 digest.',
    401,
    'INVALID_WEBHOOK_SIGNATURE',
    'Ensure MIDTRANS_SERVER_KEY matches the key used to sign the webhook payload.',
  );
}

async function recordDuplicateWebhook(
  transactionId: string,
  invoiceId: string,
  payload: MidtransWebhookPayload,
  startedAtMs: number,
) {
  const processingTimeMs = Date.now() - startedAtMs;
  const event = await prisma.webhookEvent.create({
    data: {
      transactionId,
      orderId: payload.order_id,
      gatewayTransactionId: payload.transaction_id,
      idempotencyKey: `dup-${payload.order_id}-${payload.transaction_status}-${generateRandomHexToken(6)}`,
      transactionStatus: payload.transaction_status,
      signatureKey: payload.signature_key,
      isSignatureValid: true,
      isDuplicate: true,
      scenario: payload.scenario ?? SimulationScenario.DUPLICATE_WEBHOOK,
      processingTimeMs,
      rawPayload: payload as object,
    },
  });

  await prisma.auditLog.create({
    data: {
      invoiceId,
      transactionId,
      mechanism: VerificationMechanism.WEBHOOK,
      action: 'WEBHOOK_DUPLICATE_IGNORED',
      isSuccess: true,
      latencyMs: processingTimeMs,
      message: `Idempotency guard prevented duplicate webhook processing for ${payload.order_id}.`,
    },
  });

  return {
    status: 'DUPLICATE_IGNORED',
    isDuplicate: true,
    webhookEventId: event.id,
    orderId: payload.order_id,
  };
}

async function applyValidWebhookTransition(
  transaction: {
    id: string;
    invoiceId: string;
    orderId: string;
    status: GatewayTransactionStatus;
    gatewaySettledAt: Date | null;
    createdAt: Date;
  },
  payload: MidtransWebhookPayload,
  startedAtMs: number,
) {
  const mappedStatus = mapMidtransStatusToEnum(payload.transaction_status);
  const now = new Date();
  const referenceStart = transaction.gatewaySettledAt ?? transaction.createdAt;
  const verificationLatencyMs = Math.max(5, now.getTime() - referenceStart.getTime());

  await synchronizeTransactionAndInvoice({
    transactionId: transaction.id,
    invoiceId: transaction.invoiceId,
    previousStatus: transaction.status,
    newStatus: mappedStatus,
    mechanism: VerificationMechanism.WEBHOOK,
    latencyMs: verificationLatencyMs,
    message: `Webhook verified ${transaction.orderId} -> ${mappedStatus}.`,
  });

  const processingTimeMs = Date.now() - startedAtMs;
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      transactionId: transaction.id,
      orderId: payload.order_id,
      gatewayTransactionId: payload.transaction_id,
      idempotencyKey: `${payload.order_id}:${payload.transaction_status}`,
      transactionStatus: payload.transaction_status,
      signatureKey: payload.signature_key,
      isSignatureValid: true,
      isDuplicate: false,
      scenario: payload.scenario ?? SimulationScenario.NORMAL,
      processingTimeMs,
      rawPayload: payload as object,
    },
  });

  return {
    status: 'PROCESSED',
    isDuplicate: false,
    webhookEventId: webhookEvent.id,
    orderId: payload.order_id,
    newStatus: mappedStatus,
    verificationLatencyMs,
  };
}

export async function synchronizeTransactionAndInvoice(params: {
  transactionId: string;
  invoiceId: string;
  previousStatus: GatewayTransactionStatus;
  newStatus: GatewayTransactionStatus;
  mechanism: VerificationMechanism;
  latencyMs: number;
  message: string;
}) {
  const isSettled = params.newStatus === GatewayTransactionStatus.SETTLEMENT;
  const invoiceStatus = mapGatewayToInvoiceStatus(params.newStatus);

  await prisma.paymentTransaction.update({
    where: { id: params.transactionId },
    data: {
      status: params.newStatus,
      simulatedGatewayStatus: params.newStatus,
      verifiedBy: params.mechanism,
      verificationLatencyMs: params.latencyMs,
      ...(isSettled ? { settledAt: new Date() } : {}),
    },
  });

  await prisma.invoice.update({
    where: { id: params.invoiceId },
    data: {
      status: invoiceStatus,
      ...(isSettled ? { paidAt: new Date() } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      invoiceId: params.invoiceId,
      transactionId: params.transactionId,
      mechanism: params.mechanism,
      action: `${params.mechanism}_VERIFIED`,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      latencyMs: params.latencyMs,
      isSuccess: true,
      message: params.message,
    },
  });
}

function mapGatewayToInvoiceStatus(status: GatewayTransactionStatus): InvoiceStatus {
  if (status === GatewayTransactionStatus.SETTLEMENT) {
    return InvoiceStatus.PAID;
  }
  if (status === GatewayTransactionStatus.EXPIRE) {
    return InvoiceStatus.EXPIRED;
  }
  if (status === GatewayTransactionStatus.CANCEL || status === GatewayTransactionStatus.DENY) {
    return InvoiceStatus.CANCELLED;
  }
  return InvoiceStatus.PENDING;
}

export async function pollTransactionStatus(orderId: string) {
  const startedAtMs = Date.now();
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { orderId },
  });

  if (!transaction) {
    throw new AppError(
      `Polling failed because Order ID "${orderId}" does not exist.`,
      404,
      'TRANSACTION_NOT_FOUND',
      'Check the Order ID and try polling again.',
    );
  }

  const gatewayState = await fetchGatewayTransactionStatus(orderId, transaction);
  const hasStatusChanged = gatewayState.transactionStatus !== transaction.status;

  if (!hasStatusChanged) {
    return {
      orderId,
      hasChanged: false,
      currentStatus: transaction.status,
      verifiedBy: transaction.verifiedBy,
      checkedAt: new Date().toISOString(),
    };
  }

  const referenceTime = transaction.gatewaySettledAt ?? new Date(startedAtMs);
  const latencyMs = Math.max(10, Date.now() - referenceTime.getTime());

  await synchronizeTransactionAndInvoice({
    transactionId: transaction.id,
    invoiceId: transaction.invoiceId,
    previousStatus: transaction.status,
    newStatus: gatewayState.transactionStatus,
    mechanism: VerificationMechanism.POLLING,
    latencyMs,
    message: `Polling detected gateway status "${gatewayState.transactionStatus}" for ${orderId} (webhook missed or delayed).`,
  });

  return {
    orderId,
    hasChanged: true,
    previousStatus: transaction.status,
    currentStatus: gatewayState.transactionStatus,
    verifiedBy: VerificationMechanism.POLLING,
    latencyMs,
    checkedAt: new Date().toISOString(),
  };
}

export async function runTransactionReconciliation() {
  const pendingTransactions = await prisma.paymentTransaction.findMany({
    where: { status: GatewayTransactionStatus.PENDING },
    include: { invoice: true },
  });

  let resolvedCount = 0;
  let expiredCount = 0;
  const discrepancies: Array<{ orderId: string; from: string; to: string }> = [];

  for (const transaction of pendingTransactions) {
    const gatewayState = await fetchGatewayTransactionStatus(transaction.orderId, transaction);
    const isPastExpiry =
      gatewayState.transactionStatus === GatewayTransactionStatus.PENDING &&
      transaction.expiresAt.getTime() < Date.now();

    const targetStatus = isPastExpiry
      ? GatewayTransactionStatus.EXPIRE
      : gatewayState.transactionStatus;

    if (targetStatus !== transaction.status) {
      const referenceTime = transaction.gatewaySettledAt ?? transaction.createdAt;
      const latencyMs = Math.max(15, Date.now() - referenceTime.getTime());

      await synchronizeTransactionAndInvoice({
        transactionId: transaction.id,
        invoiceId: transaction.invoiceId,
        previousStatus: transaction.status,
        newStatus: targetStatus,
        mechanism: VerificationMechanism.RECONCILIATION,
        latencyMs,
        message: `Reconciliation resolved discrepancy for ${transaction.orderId}: local=${transaction.status}, gateway=${targetStatus}.`,
      });

      discrepancies.push({
        orderId: transaction.orderId,
        from: transaction.status,
        to: targetStatus,
      });

      if (targetStatus === GatewayTransactionStatus.EXPIRE) {
        expiredCount += 1;
      } else {
        resolvedCount += 1;
      }
    }
  }

  return {
    checkedCount: pendingTransactions.length,
    resolvedCount,
    expiredCount,
    discrepancies,
    reconciledAt: new Date().toISOString(),
  };
}

export async function getSystemReliabilityReport() {
  const [transactions, webhookEvents, simulationRuns, recentAuditLogs] = await Promise.all([
    prisma.paymentTransaction.findMany(),
    prisma.webhookEvent.findMany(),
    prisma.simulationRun.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

  const settledTransactions = transactions.filter(
    (item) => item.status === GatewayTransactionStatus.SETTLEMENT,
  );
  const verifiedByWebhook = settledTransactions.filter(
    (item) => item.verifiedBy === VerificationMechanism.WEBHOOK,
  );
  const verifiedByPolling = settledTransactions.filter(
    (item) => item.verifiedBy === VerificationMechanism.POLLING,
  );
  const verifiedByReconciliation = settledTransactions.filter(
    (item) => item.verifiedBy === VerificationMechanism.RECONCILIATION,
  );

  const totalSettledInGateway = transactions.filter(
    (item) =>
      item.status === GatewayTransactionStatus.SETTLEMENT ||
      item.simulatedGatewayStatus === GatewayTransactionStatus.SETTLEMENT,
  ).length;

  const webhookOnlyAccuracyPct =
    totalSettledInGateway > 0
      ? Number(((verifiedByWebhook.length / totalSettledInGateway) * 100).toFixed(2))
      : 100;

  const hybridVerifiedCount =
    verifiedByWebhook.length + verifiedByPolling.length + verifiedByReconciliation.length;
  const hybridAccuracyPct =
    totalSettledInGateway > 0
      ? Number(((hybridVerifiedCount / totalSettledInGateway) * 100).toFixed(2))
      : 100;

  return {
    overview: {
      totalTransactions: transactions.length,
      totalSettledInGateway,
      webhookVerifiedCount: verifiedByWebhook.length,
      pollingRecoveredCount: verifiedByPolling.length,
      reconciliationRecoveredCount: verifiedByReconciliation.length,
      pendingUnresolvedCount: transactions.filter(
        (item) =>
          item.status === GatewayTransactionStatus.PENDING &&
          item.simulatedGatewayStatus === GatewayTransactionStatus.SETTLEMENT,
      ).length,
      webhookOnlyAccuracyPct,
      hybridAccuracyPct,
      accuracyImprovementPct: Number((hybridAccuracyPct - webhookOnlyAccuracyPct).toFixed(2)),
    },
    webhookStats: {
      totalEventsReceived: webhookEvents.length,
      validEventsCount: webhookEvents.filter((item) => item.isSignatureValid && !item.isDuplicate)
        .length,
      duplicatePreventedCount: webhookEvents.filter((item) => item.isDuplicate).length,
      invalidSignatureRejectedCount: webhookEvents.filter((item) => !item.isSignatureValid).length,
    },
    latencyByMechanismMs: {
      webhookAvgMs: computeAverageLatency(verifiedByWebhook),
      pollingAvgMs: computeAverageLatency(verifiedByPolling),
      reconciliationAvgMs: computeAverageLatency(verifiedByReconciliation),
    },
    simulationRuns,
    recentAuditLogs,
  };
}

function computeAverageLatency(items: Array<{ verificationLatencyMs: number | null }>): number {
  const validLatencies = items
    .map((item) => item.verificationLatencyMs)
    .filter((value): value is number => typeof value === 'number' && value > 0);

  if (validLatencies.length === 0) {
    return 0;
  }
  const sum = validLatencies.reduce((acc, current) => acc + current, 0);
  return Math.round(sum / validLatencies.length);
}

