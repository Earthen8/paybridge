import { Router } from 'express';
import { z } from 'zod';
import { convertIdrToCrypto, getMarketCryptoRates } from '../services/cryptoRateService.js';

export const cryptoRouter = Router();

const convertQuerySchema = z.object({
  amountIdr: z.coerce.number().min(0, 'Amount must be non-negative'),
});

cryptoRouter.get('/rates', async (request, response, next) => {
  try {
    const forceRefresh = request.query.refresh === 'true';
    const rates = await getMarketCryptoRates(forceRefresh);
    response.json(rates);
  } catch (error) {
    next(error);
  }
});

cryptoRouter.get('/convert', async (request, response, next) => {
  try {
    const { amountIdr } = convertQuerySchema.parse(request.query);
    const conversion = await convertIdrToCrypto(amountIdr);
    response.json(conversion);
  } catch (error) {
    next(error);
  }
});

