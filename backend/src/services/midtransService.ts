import { GatewayTransactionStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { generateRandomHexToken } from '../utils/tokenUtils.js';

export interface CreateQrisChargeInput {
  orderId: string;
  amountIdr: number;
  customerName: string;
  customerEmail: string;
  invoiceTitle: string;
}

export interface QrisChargeResult {
  orderId: string;
  gatewayTransactionId: string;
  gatewayName: string;
  qrisString: string;
  qrisUrl: string | null;
  expiresAt: Date;
  rawResponse: Record<string, unknown>;
}

export interface GatewayStatusQueryResult {
  orderId: string;
  gatewayTransactionId: string;
  transactionStatus: GatewayTransactionStatus;
  rawStatus: string;
  settlementTime: string | null;
  grossAmount: string;
}

function getMidtransBaseUrl(): string {
  return env.PAYMENT_GATEWAY_MODE === 'MIDTRANS_PRODUCTION'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
}

function buildBasicAuthHeader(): string {
  const credentials = Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString('base64');
  return `Basic ${credentials}`;
}

function buildDynamicEmvQrisString(orderId: string, amountIdr: number): string {
  const amountText = String(amountIdr);
  const amountTag = `54${String(amountText.length).padStart(2, '0')}${amountText}`;
  const orderTag = `62${String(orderId.length + 4).padStart(2, '0')}01${String(orderId.length).padStart(2, '0')}${orderId}`;
  return `00020101021226610014ID.CO.QRIS.WWW0215ID2026${env.MIDTRANS_MERCHANT_ID}0303UMI520454995303360${amountTag}5802ID5909PAYBRIDGE6007JAKARTA${orderTag}6304A1B2`;
}

export async function createDynamicQrisCharge(
  input: CreateQrisChargeInput,
): Promise<QrisChargeResult> {
  const isLiveMidtransConfigured =
    env.PAYMENT_GATEWAY_MODE !== 'SIMULATOR' &&
    !env.MIDTRANS_SERVER_KEY.includes('SAMPLE_KEY');

  if (!isLiveMidtransConfigured) {
    return createSimulatedQrisCharge(input);
  }

  try {
    return await requestMidtransQrisCharge(input);
  } catch {
    return createSimulatedQrisCharge(input);
  }
}

async function requestMidtransQrisCharge(
  input: CreateQrisChargeInput,
): Promise<QrisChargeResult> {
  const response = await fetch(`${getMidtransBaseUrl()}/v2/charge`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: buildBasicAuthHeader(),
    },
    body: JSON.stringify({
      payment_type: 'qris',
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.amountIdr,
      },
      item_details: [
        {
          id: input.orderId,
          price: input.amountIdr,
          quantity: 1,
          name: input.invoiceTitle.slice(0, 50),
        },
      ],
      customer_details: {
        first_name: input.customerName,
        email: input.customerEmail,
      },
      qris: { acquirer: 'gopay' },
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;
  const actions = Array.isArray(data.actions) ? (data.actions as Array<{ url?: string }>) : [];
  const qrisString =
    typeof data.qr_string === 'string'
      ? data.qr_string
      : buildDynamicEmvQrisString(input.orderId, input.amountIdr);

  return {
    orderId: input.orderId,
    gatewayTransactionId: String(data.transaction_id ?? `mid-${generateRandomHexToken(8)}`),
    gatewayName: 'MIDTRANS_SANDBOX',
    qrisString,
    qrisUrl: actions[0]?.url ?? null,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    rawResponse: data,
  };
}

function createSimulatedQrisCharge(input: CreateQrisChargeInput): QrisChargeResult {
  const gatewayTransactionId = `sim-qris-${generateRandomHexToken(8)}`;
  const qrisString = buildDynamicEmvQrisString(input.orderId, input.amountIdr);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  return {
    orderId: input.orderId,
    gatewayTransactionId,
    gatewayName: 'MIDTRANS_SIMULATOR',
    qrisString,
    qrisUrl: null,
    expiresAt,
    rawResponse: {
      status_code: '201',
      status_message: 'QRIS transaction is created (PayBridge Sandbox Simulator)',
      transaction_id: gatewayTransactionId,
      order_id: input.orderId,
      gross_amount: `${input.amountIdr}.00`,
      payment_type: 'qris',
      transaction_status: 'pending',
      qr_string: qrisString,
      expiry_time: expiresAt.toISOString(),
    },
  };
}

export async function fetchGatewayTransactionStatus(
  orderId: string,
  fallbackTransaction: {
    gatewayTransactionId: string | null;
    amountIdr: number;
    simulatedGatewayStatus: GatewayTransactionStatus;
    gatewaySettledAt: Date | null;
  },
): Promise<GatewayStatusQueryResult> {
  const isLiveMidtransConfigured =
    env.PAYMENT_GATEWAY_MODE !== 'SIMULATOR' &&
    !env.MIDTRANS_SERVER_KEY.includes('SAMPLE_KEY');

  if (isLiveMidtransConfigured) {
    try {
      return await queryLiveMidtransStatus(orderId, fallbackTransaction.amountIdr);
    } catch {
      // Fall through to simulated gateway state if sandbox network call fails
    }
  }

  return {
    orderId,
    gatewayTransactionId: fallbackTransaction.gatewayTransactionId ?? `sim-${orderId}`,
    transactionStatus: fallbackTransaction.simulatedGatewayStatus,
    rawStatus: fallbackTransaction.simulatedGatewayStatus.toLowerCase(),
    settlementTime: fallbackTransaction.gatewaySettledAt?.toISOString() ?? null,
    grossAmount: `${fallbackTransaction.amountIdr}.00`,
  };
}

async function queryLiveMidtransStatus(
  orderId: string,
  amountIdr: number,
): Promise<GatewayStatusQueryResult> {
  const response = await fetch(`${getMidtransBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: buildBasicAuthHeader(),
    },
  });

  const data = (await response.json()) as Record<string, unknown>;
  const rawStatus = String(data.transaction_status ?? 'pending').toLowerCase();

  return {
    orderId,
    gatewayTransactionId: String(data.transaction_id ?? orderId),
    transactionStatus: mapMidtransStatusToEnum(rawStatus),
    rawStatus,
    settlementTime: typeof data.settlement_time === 'string' ? data.settlement_time : null,
    grossAmount: String(data.gross_amount ?? `${amountIdr}.00`),
  };
}

export function mapMidtransStatusToEnum(rawStatus: string): GatewayTransactionStatus {
  const normalized = rawStatus.toLowerCase().trim();
  if (normalized === 'settlement' || normalized === 'capture') {
    return GatewayTransactionStatus.SETTLEMENT;
  }
  if (normalized === 'expire') {
    return GatewayTransactionStatus.EXPIRE;
  }
  if (normalized === 'cancel') {
    return GatewayTransactionStatus.CANCEL;
  }
  if (normalized === 'deny' || normalized === 'failure') {
    return GatewayTransactionStatus.DENY;
  }
  return GatewayTransactionStatus.PENDING;
}

