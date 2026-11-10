export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export type GatewayTransactionStatus = 'PENDING' | 'SETTLEMENT' | 'EXPIRE' | 'CANCEL' | 'DENY';

export type VerificationMechanism =
  | 'WEBHOOK'
  | 'POLLING'
  | 'RECONCILIATION'
  | 'MANUAL'
  | 'SIMULATION'
  | 'SYSTEM';

export type SimulationScenario =
  | 'NORMAL'
  | 'DELAYED_WEBHOOK'
  | 'FAILED_WEBHOOK'
  | 'DUPLICATE_WEBHOOK'
  | 'MIXED_BATCH';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  businessName: string;
  phone: string | null;
  createdAt: string;
}

export interface CryptoMarketRates {
  btcRateIdr: number;
  ethRateIdr: number;
  btcChange24h: number;
  ethChange24h: number;
  source: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  orderId: string;
  gatewayTransactionId: string | null;
  gatewayName: string;
  amountIdr: number;
  qrisString: string;
  qrisUrl: string | null;
  status: GatewayTransactionStatus;
  simulatedGatewayStatus: GatewayTransactionStatus;
  verifiedBy: VerificationMechanism | null;
  verificationLatencyMs: number | null;
  expiresAt: string;
  settledAt: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  publicToken: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  title: string;
  description: string | null;
  amountIdr: number;
  btcAmount: string;
  ethAmount: string;
  btcRateIdr: string;
  ethRateIdr: string;
  rateLockedAt: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  user?: {
    name: string;
    businessName: string;
    email: string;
    phone: string | null;
  };
  transactions?: PaymentTransaction[];
  auditLogs?: AuditLogItem[];
}

export interface AuditLogItem {
  id: string;
  invoiceId: string | null;
  transactionId: string | null;
  mechanism: VerificationMechanism;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  latencyMs: number | null;
  isSuccess: boolean;
  message: string;
  createdAt: string;
  invoice?: {
    invoiceNumber: string;
    clientName: string;
    amountIdr: number;
  };
  transaction?: {
    orderId: string;
    status: GatewayTransactionStatus;
    verifiedBy: VerificationMechanism | null;
  };
}

export interface WebhookEventItem {
  id: string;
  orderId: string;
  idempotencyKey: string;
  transactionStatus: string;
  isSignatureValid: boolean;
  isDuplicate: boolean;
  scenario: SimulationScenario;
  processingTimeMs: number;
  createdAt: string;
}

export interface SimulationRunItem {
  id: string;
  scenario: SimulationScenario;
  totalSamples: number;
  webhookOnlyAccuracyPct: string;
  hybridAccuracyPct: string;
  webhookSuccessCount: number;
  pollingRecoveredCount: number;
  reconcileRecoveredCount: number;
  duplicateBlockedCount: number;
  avgWebhookLatencyMs: number;
  avgHybridLatencyMs: number;
  details: {
    description?: string;
  };
  createdAt: string;
}

export interface DashboardSummaryResponse {
  metrics: {
    totalInvoicesCount: number;
    paidInvoicesCount: number;
    pendingInvoicesCount: number;
    draftInvoicesCount: number;
    totalPaidIdr: number;
    totalPaidBtc: number;
    totalPaidEth: number;
    totalPendingIdr: number;
  };
  cryptoRates: CryptoMarketRates;
  reliabilityOverview: {
    totalTransactions: number;
    totalSettledInGateway: number;
    webhookVerifiedCount: number;
    pollingRecoveredCount: number;
    reconciliationRecoveredCount: number;
    pendingUnresolvedCount: number;
    webhookOnlyAccuracyPct: number;
    hybridAccuracyPct: number;
    accuracyImprovementPct: number;
  };
  recentInvoices: Invoice[];
  recentAuditLogs: AuditLogItem[];
}

export interface ReliabilityReportResponse {
  overview: DashboardSummaryResponse['reliabilityOverview'];
  webhookStats: {
    totalEventsReceived: number;
    validEventsCount: number;
    duplicatePreventedCount: number;
    invalidSignatureRejectedCount: number;
  };
  latencyByMechanismMs: {
    webhookAvgMs: number;
    pollingAvgMs: number;
    reconciliationAvgMs: number;
  };
  simulationRuns: SimulationRunItem[];
  recentAuditLogs: AuditLogItem[];
}

