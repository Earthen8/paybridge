import { InvoiceStatus, VerificationMechanism } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/appError.js';
import { generateRandomHexToken } from '../utils/tokenUtils.js';
import { convertIdrToCrypto } from './cryptoRateService.js';
import { createDynamicQrisCharge } from './midtransService.js';

export interface CreateInvoiceInput {
  userId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  title: string;
  description?: string;
  amountIdr: number;
  dueDate: string;
  publishImmediately?: boolean;
}

export interface UpdateInvoiceInput {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  title?: string;
  description?: string;
  amountIdr?: number;
  dueDate?: string;
  status?: InvoiceStatus;
}

function generateInvoiceNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = generateRandomHexToken(3).toUpperCase();
  return `INV-${datePart}-${randomSuffix}`;
}

export async function createInvoice(input: CreateInvoiceInput) {
  const cryptoConversion = await convertIdrToCrypto(input.amountIdr);
  const initialStatus = input.publishImmediately ? InvoiceStatus.PENDING : InvoiceStatus.DRAFT;

  const createdInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      publicToken: generateRandomHexToken(12),
      userId: input.userId,
      clientName: input.clientName.trim(),
      clientEmail: input.clientEmail.trim(),
      clientPhone: input.clientPhone?.trim(),
      title: input.title.trim(),
      description: input.description?.trim(),
      amountIdr: input.amountIdr,
      btcAmount: cryptoConversion.btcAmount,
      ethAmount: cryptoConversion.ethAmount,
      btcRateIdr: cryptoConversion.btcRateIdr,
      ethRateIdr: cryptoConversion.ethRateIdr,
      status: initialStatus,
      dueDate: new Date(input.dueDate),
    },
    include: { transactions: true },
  });

  await prisma.auditLog.create({
    data: {
      invoiceId: createdInvoice.id,
      userId: input.userId,
      mechanism: VerificationMechanism.SYSTEM,
      action: 'INVOICE_CREATED',
      newStatus: createdInvoice.status,
      message: `Invoice ${createdInvoice.invoiceNumber} created for Rp ${input.amountIdr.toLocaleString('id-ID')}.`,
    },
  });

  return createdInvoice;
}

export async function listUserInvoices(userId: string, statusFilter?: InvoiceStatus) {
  return prisma.invoice.findMany({
    where: {
      userId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getInvoiceByIdForUser(invoiceId: string, userId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: {
      transactions: { orderBy: { createdAt: 'desc' } },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 25 },
    },
  });

  if (!invoice) {
    throw new AppError(
      `Invoice lookup failed because invoice "${invoiceId}" was not found.`,
      404,
      'INVOICE_NOT_FOUND',
      'Verify the invoice ID and ensure it belongs to your account.',
    );
  }
  return invoice;
}

export async function getInvoiceByPublicToken(publicToken: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken },
    include: {
      user: { select: { name: true, businessName: true, email: true, phone: true } },
      transactions: { orderBy: { createdAt: 'desc' }, take: 1 },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!invoice) {
    throw new AppError(
      'Public invoice link is invalid or no longer available.',
      404,
      'PUBLIC_INVOICE_NOT_FOUND',
      'Contact the freelancer to request an updated payment link.',
    );
  }
  return invoice;
}

export async function updateInvoice(
  invoiceId: string,
  userId: string,
  input: UpdateInvoiceInput,
) {
  const existing = await getInvoiceByIdForUser(invoiceId, userId);
  if (existing.status === InvoiceStatus.PAID) {
    throw new AppError(
      'Cannot modify an invoice that has already been paid.',
      400,
      'INVOICE_ALREADY_PAID',
      'Create a new invoice for additional billable items.',
    );
  }

  const cryptoUpdate =
    input.amountIdr !== undefined ? await convertIdrToCrypto(input.amountIdr) : null;

  return prisma.invoice.update({
    where: { id: existing.id },
    data: {
      clientName: input.clientName?.trim(),
      clientEmail: input.clientEmail?.trim(),
      clientPhone: input.clientPhone?.trim(),
      title: input.title?.trim(),
      description: input.description?.trim(),
      amountIdr: input.amountIdr,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      status: input.status,
      ...(cryptoUpdate
        ? {
            btcAmount: cryptoUpdate.btcAmount,
            ethAmount: cryptoUpdate.ethAmount,
            btcRateIdr: cryptoUpdate.btcRateIdr,
            ethRateIdr: cryptoUpdate.ethRateIdr,
            rateLockedAt: new Date(),
          }
        : {}),
    },
    include: { transactions: { orderBy: { createdAt: 'desc' } } },
  });
}

export async function deleteInvoice(invoiceId: string, userId: string) {
  const existing = await getInvoiceByIdForUser(invoiceId, userId);
  if (existing.status === InvoiceStatus.PAID) {
    throw new AppError(
      'Cannot delete an invoice that has already been paid.',
      400,
      'INVOICE_ALREADY_PAID',
      'Paid invoices must be retained for transaction history and reconciliation.',
    );
  }

  await prisma.invoice.delete({ where: { id: existing.id } });
  return { deletedId: existing.id, invoiceNumber: existing.invoiceNumber };
}

export async function generateDynamicQrisForInvoice(publicToken: string) {
  const invoice = await getInvoiceByPublicToken(publicToken);
  if (invoice.status === InvoiceStatus.PAID) {
    throw new AppError(
      'Cannot generate QRIS because this invoice is already marked as PAID.',
      400,
      'INVOICE_ALREADY_PAID',
      'Refresh the payment page to view the payment receipt.',
    );
  }

  const activeTransaction = invoice.transactions[0];
  const hasActiveUnexpiredQris =
    activeTransaction &&
    activeTransaction.status === 'PENDING' &&
    activeTransaction.expiresAt.getTime() > Date.now();

  if (hasActiveUnexpiredQris) {
    return activeTransaction;
  }

  const orderId = `PB-${invoice.invoiceNumber}-${generateRandomHexToken(3).toUpperCase()}`;
  const charge = await createDynamicQrisCharge({
    orderId,
    amountIdr: invoice.amountIdr,
    customerName: invoice.clientName,
    customerEmail: invoice.clientEmail,
    invoiceTitle: invoice.title,
  });

  return saveNewQrisTransaction(invoice.id, invoice.status, charge);
}

async function saveNewQrisTransaction(
  invoiceId: string,
  currentStatus: InvoiceStatus,
  charge: Awaited<ReturnType<typeof createDynamicQrisCharge>>,
) {
  const transaction = await prisma.paymentTransaction.create({
    data: {
      invoiceId,
      orderId: charge.orderId,
      gatewayTransactionId: charge.gatewayTransactionId,
      gatewayName: charge.gatewayName,
      amountIdr: Number(
        (charge.rawResponse.gross_amount as string | undefined)?.replace('.00', '') ?? 0,
      ) || 0,
      qrisString: charge.qrisString,
      qrisUrl: charge.qrisUrl,
      expiresAt: charge.expiresAt,
      rawGatewayResponse: charge.rawResponse as object,
    },
  });

  if (currentStatus === InvoiceStatus.DRAFT) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.PENDING },
    });
  }

  await prisma.auditLog.create({
    data: {
      invoiceId,
      transactionId: transaction.id,
      mechanism: VerificationMechanism.SYSTEM,
      action: 'QRIS_GENERATED',
      previousStatus: currentStatus,
      newStatus: InvoiceStatus.PENDING,
      message: `Dynamic QRIS generated with Order ID ${charge.orderId}.`,
    },
  });

  return transaction;
}

