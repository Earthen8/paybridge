import { InvoiceStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { isSimulationModeActive } from '../config/env.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { createRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { getDashboardSummary } from '../services/dashboardService.js';
import {
  createInvoice,
  deleteInvoice,
  generateDynamicQrisForInvoice,
  getInvoiceByIdForUser,
  getInvoiceByPublicToken,
  listUserInvoices,
  updateInvoice,
} from '../services/invoiceService.js';

export const invoiceRouter = Router();

const publicQrisLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 15,
  message: 'Terlalu banyak permintaan pembuatan QRIS untuk tautan ini.',
});

const createInvoiceSchema = z.object({
  clientName: z.string().min(2, 'Nama klien minimal 2 karakter'),
  clientEmail: z
    .string()
    .trim()
    .email('Format email klien tidak valid')
    .optional()
    .or(z.literal('')),
  clientPhone: z.string().optional(),
  title: z.string().min(3, 'Judul pekerjaan minimal 3 karakter'),
  description: z.string().optional(),
  amountIdr: z.coerce.number().int().min(1000, 'Nominal tagihan minimal Rp 1.000'),
  dueDate: z.string().min(1, 'Tanggal jatuh tempo wajib diisi'),
  publishImmediately: z.boolean().optional(),
  sendEmailCopy: z.boolean().optional(),
});

const updateInvoiceSchema = z.object({
  clientName: z.string().min(2).optional(),
  clientEmail: z.string().trim().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  amountIdr: z.coerce.number().int().min(1000).optional(),
  dueDate: z.string().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
});

invoiceRouter.get('/dashboard-summary', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const summary = await getDashboardSummary(request.user!.userId);
    response.json(summary);
  } catch (error) {
    next(error);
  }
});

invoiceRouter.get('/public/:publicToken', async (request, response, next) => {
  try {
    const invoice = await getInvoiceByPublicToken(request.params.publicToken);
    response.json({ invoice, isSimulationEnabled: isSimulationModeActive() });
  } catch (error) {
    next(error);
  }
});

invoiceRouter.post('/public/:publicToken/qris', publicQrisLimiter, async (request, response, next) => {
  try {
    const transaction = await generateDynamicQrisForInvoice(String(request.params.publicToken));
    response.status(201).json({ transaction });
  } catch (error) {
    next(error);
  }
});

invoiceRouter.get('/', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const rawStatus = typeof request.query.status === 'string' ? request.query.status : undefined;
    const statusFilter =
      rawStatus && Object.values(InvoiceStatus).includes(rawStatus as InvoiceStatus)
        ? (rawStatus as InvoiceStatus)
        : undefined;

    const invoices = await listUserInvoices(request.user!.userId, statusFilter);
    response.json({ invoices });
  } catch (error) {
    next(error);
  }
});

invoiceRouter.post('/', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const validatedInput = createInvoiceSchema.parse(request.body);
    const result = await createInvoice({
      ...validatedInput,
      userId: request.user!.userId,
    });
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

invoiceRouter.get('/:id', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const invoice = await getInvoiceByIdForUser(String(request.params.id), request.user!.userId);
    response.json({ invoice });
  } catch (error) {
    next(error);
  }
});

invoiceRouter.patch('/:id', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const validatedInput = updateInvoiceSchema.parse(request.body);
    const invoice = await updateInvoice(
      String(request.params.id),
      request.user!.userId,
      validatedInput,
    );
    response.json({ invoice });
  } catch (error) {
    next(error);
  }
});

invoiceRouter.delete('/:id', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const result = await deleteInvoice(String(request.params.id), request.user!.userId);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

