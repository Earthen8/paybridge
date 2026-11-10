import { InvoiceStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { getMarketCryptoRates } from './cryptoRateService.js';
import { getSystemReliabilityReport } from './verificationService.js';

export async function getDashboardSummary(userId: string) {
  const [invoices, cryptoRates, reliabilityReport] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    }),
    getMarketCryptoRates(),
    getSystemReliabilityReport(),
  ]);

  const paidInvoices = invoices.filter((item) => item.status === InvoiceStatus.PAID);
  const pendingInvoices = invoices.filter((item) => item.status === InvoiceStatus.PENDING);
  const draftInvoices = invoices.filter((item) => item.status === InvoiceStatus.DRAFT);

  const totalPaidIdr = paidInvoices.reduce((sum, item) => sum + item.amountIdr, 0);
  const totalPendingIdr = pendingInvoices.reduce((sum, item) => sum + item.amountIdr, 0);

  return {
    metrics: {
      totalInvoicesCount: invoices.length,
      paidInvoicesCount: paidInvoices.length,
      pendingInvoicesCount: pendingInvoices.length,
      draftInvoicesCount: draftInvoices.length,
      totalPaidIdr,
      totalPaidBtc: Number((totalPaidIdr / cryptoRates.btcRateIdr).toFixed(8)),
      totalPaidEth: Number((totalPaidIdr / cryptoRates.ethRateIdr).toFixed(8)),
      totalPendingIdr,
    },
    cryptoRates,
    reliabilityOverview: reliabilityReport.overview,
    recentInvoices: invoices.slice(0, 6),
    recentAuditLogs: reliabilityReport.recentAuditLogs.slice(0, 8),
  };
}

