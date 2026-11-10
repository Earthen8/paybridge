import { InvoiceStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
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

const createInvoiceSchema = z.object({
  clientName: z.string().min(2, 'Client name is required'),
  clientEmail: z.string().email('Valid client email is required'),
  clientPhone: z.string().optional(),
  title: z.string().min(3, 'Invoice title is required'),
  description: z.string().optional(),
  amountIdr: z.coerce.number().int().min(1000, 'Minimum invoice amount is Rp 1.000'),
  dueDate: z.string().min(1, 'Due date is required'),
  publishImmediately: z.boolean().optional(),
});

const updateInvoiceSchema = z.object({
  clientName: z.string().min(2).optional(),
  clientEmail: z.string().email().optional(),
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
    response.json({ invoice });
  } catch (error) {
    next(error);
  }
});

invoiceRouter.post('/public/:publicToken/qris', async (request, response, next) => {
  try {
    const transaction = await generateDynamicQrisForInvoice(request.params.publicToken);
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
    const invoice = await createInvoice({
      ...validatedInput,
      userId: request.user!.userId,
    });
    response.status(201).json({ invoice });
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

