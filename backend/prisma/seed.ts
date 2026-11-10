import bcrypt from 'bcryptjs';
import {
  GatewayTransactionStatus,
  InvoiceStatus,
  PrismaClient,
  SimulationScenario,
  VerificationMechanism,
} from '@prisma/client';

const prisma = new PrismaClient();

async function seedDatabase(): Promise<void> {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'freelancer@paybridge.id' },
    update: {},
    create: {
      name: 'Raka Pratama',
      email: 'freelancer@paybridge.id',
      passwordHash,
      businessName: 'Pratama Creative & Dev Studio',
      phone: '+6281234567890',
    },
  });

  await seedSampleInvoices(demoUser.id);
  await seedInitialSimulationRuns();

  console.log('[Seed Completed] Demo account ready: freelancer@paybridge.id / Password123!');
}

async function seedSampleInvoices(userId: string): Promise<void> {
  const existingCount = await prisma.invoice.count({ where: { userId } });
  if (existingCount > 0) {
    return;
  }

  const btcRateIdr = 1_520_000_000;
  const ethRateIdr = 48_500_000;

  const paidInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-20261110-A101',
      publicToken: 'demo-paid-webhook-token-001',
      userId,
      clientName: 'PT Nusantara Digital',
      clientEmail: 'finance@nusantaradigital.co.id',
      title: 'UI/UX Redesign & Landing Page React',
      description: 'Pembuatan desain Figma 5 halaman dan implementasi React + Tailwind CSS.',
      amountIdr: 2_500_000,
      btcAmount: Number((2_500_000 / btcRateIdr).toFixed(8)),
      ethAmount: Number((2_500_000 / ethRateIdr).toFixed(8)),
      btcRateIdr,
      ethRateIdr,
      status: InvoiceStatus.PAID,
      dueDate: new Date(Date.now() + 7 * 86_400_000),
      paidAt: new Date(Date.now() - 3_600_000),
    },
  });

  const paidTx = await prisma.paymentTransaction.create({
    data: {
      invoiceId: paidInvoice.id,
      orderId: 'PB-INV-20261110-A101-WH1',
      gatewayTransactionId: 'mid-tx-001',
      gatewayName: 'MIDTRANS_SIMULATOR',
      amountIdr: 2_500_000,
      qrisString: '00020101021226610014ID.CO.QRIS.WWW0215ID2026G1234567890303UMI540725000005802ID5909PAYBRIDGE6304A1B2',
      status: GatewayTransactionStatus.SETTLEMENT,
      simulatedGatewayStatus: GatewayTransactionStatus.SETTLEMENT,
      verifiedBy: VerificationMechanism.WEBHOOK,
      verificationLatencyMs: 210,
      expiresAt: new Date(Date.now() + 3_600_000),
      gatewaySettledAt: new Date(Date.now() - 3_600_210),
      settledAt: new Date(Date.now() - 3_600_000),
    },
  });

  await prisma.auditLog.create({
    data: {
      invoiceId: paidInvoice.id,
      transactionId: paidTx.id,
      userId,
      mechanism: VerificationMechanism.WEBHOOK,
      action: 'WEBHOOK_VERIFIED',
      previousStatus: 'PENDING',
      newStatus: 'SETTLEMENT',
      latencyMs: 210,
      isSuccess: true,
      message: 'Webhook verified PB-INV-20261110-A101-WH1 -> SETTLEMENT.',
    },
  });

  const pendingInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-20261110-B202',
      publicToken: 'demo-pending-qris-token-002',
      userId,
      clientName: 'Komunitas Mahasiswa Informatika',
      clientEmail: 'bem-if@kampus.ac.id',
      title: 'Pengembangan Sistem Registrasi Workshop',
      description: 'Backend API Node.js + Integrasi QRIS Dinamis untuk tiket peserta.',
      amountIdr: 750_000,
      btcAmount: Number((750_000 / btcRateIdr).toFixed(8)),
      ethAmount: Number((750_000 / ethRateIdr).toFixed(8)),
      btcRateIdr,
      ethRateIdr,
      status: InvoiceStatus.PENDING,
      dueDate: new Date(Date.now() + 5 * 86_400_000),
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      invoiceId: pendingInvoice.id,
      orderId: 'PB-INV-20261110-B202-QR1',
      gatewayTransactionId: 'mid-tx-002',
      gatewayName: 'MIDTRANS_SIMULATOR',
      amountIdr: 750_000,
      qrisString: '00020101021226610014ID.CO.QRIS.WWW0215ID2026G1234567890303UMI54067500005802ID5909PAYBRIDGE6304C3D4',
      status: GatewayTransactionStatus.PENDING,
      simulatedGatewayStatus: GatewayTransactionStatus.PENDING,
      expiresAt: new Date(Date.now() + 24 * 3_600_000),
    },
  });
}

async function seedInitialSimulationRuns(): Promise<void> {
  const existingSimulations = await prisma.simulationRun.count();
  if (existingSimulations > 0) {
    return;
  }

  await prisma.simulationRun.createMany({
    data: [
      {
        scenario: SimulationScenario.DELAYED_WEBHOOK,
        totalSamples: 20,
        webhookOnlyAccuracyPct: 35.0,
        hybridAccuracyPct: 100.0,
        webhookSuccessCount: 7,
        pollingRecoveredCount: 13,
        reconcileRecoveredCount: 0,
        duplicateBlockedCount: 13,
        avgWebhookLatencyMs: 6500,
        avgHybridLatencyMs: 1250,
        details: {
          description:
            'Simulasi webhook terlambat 6.5 detik: Active Polling memverifikasi 13 transaksi lebih awal dan menolak webhook terlambat secara idempoten.',
        },
      },
      {
        scenario: SimulationScenario.FAILED_WEBHOOK,
        totalSamples: 20,
        webhookOnlyAccuracyPct: 0.0,
        hybridAccuracyPct: 100.0,
        webhookSuccessCount: 0,
        pollingRecoveredCount: 14,
        reconcileRecoveredCount: 6,
        duplicateBlockedCount: 0,
        avgWebhookLatencyMs: 0,
        avgHybridLatencyMs: 1420,
        details: {
          description:
            'Simulasi webhook gagal/drop 100%: Metode Webhook-Only gagal memperbarui seluruh transaksi, sedangkan kombinasi Polling (14) + Rekonsiliasi (6) memulihkan akurasi menjadi 100%.',
        },
      },
      {
        scenario: SimulationScenario.DUPLICATE_WEBHOOK,
        totalSamples: 20,
        webhookOnlyAccuracyPct: 100.0,
        hybridAccuracyPct: 100.0,
        webhookSuccessCount: 20,
        pollingRecoveredCount: 0,
        reconcileRecoveredCount: 0,
        duplicateBlockedCount: 60,
        avgWebhookLatencyMs: 180,
        avgHybridLatencyMs: 180,
        details: {
          description:
            'Simulasi webhook terkirim berulang (4x per transaksi = 80 total request): Idempotency guard berhasil memblokir 60 duplikasi tanpa double-settlement.',
        },
      },
    ],
  });
}

seedDatabase()
  .catch((error) => {
    console.error('[Seed Failed]', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

