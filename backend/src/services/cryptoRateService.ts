import { env } from '../config/env.js';

export interface CryptoMarketRates {
  btcRateIdr: number;
  ethRateIdr: number;
  btcChange24h: number;
  ethChange24h: number;
  source: 'COINGECKO_LIVE' | 'CACHED_COINGECKO' | 'FALLBACK_MARKET_ESTIMATE';
  updatedAt: string;
}

export interface CryptoConversionResult extends CryptoMarketRates {
  amountIdr: number;
  btcAmount: number;
  ethAmount: number;
}

interface CoinGeckoPriceResponse {
  bitcoin?: { idr?: number; idr_24h_change?: number };
  ethereum?: { idr?: number; idr_24h_change?: number };
}

const CACHE_TTL_MS = 60_000;
const FALLBACK_BTC_IDR = 1_520_000_000;
const FALLBACK_ETH_IDR = 48_500_000;

let cachedRates: CryptoMarketRates | null = null;
let cacheTimestampMs = 0;

function buildCoinGeckoUrl(): string {
  const baseUrl = env.COINGECKO_API_URL.replace(/\/$/, '');
  return `${baseUrl}/simple/price?ids=bitcoin,ethereum&vs_currencies=idr&include_24hr_change=true`;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = env.COINGECKO_API_KEY;
  }
  return headers;
}

export async function getMarketCryptoRates(forceRefresh = false): Promise<CryptoMarketRates> {
  const isCacheFresh = cachedRates !== null && Date.now() - cacheTimestampMs < CACHE_TTL_MS;
  if (!forceRefresh && isCacheFresh && cachedRates) {
    return { ...cachedRates, source: 'CACHED_COINGECKO' };
  }

  try {
    const response = await fetch(buildCoinGeckoUrl(), {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`CoinGecko responded with HTTP ${response.status}`);
    }
    const payload = (await response.json()) as CoinGeckoPriceResponse;
    return updateCachedRates(payload);
  } catch {
    return getFallbackOrStaleRates();
  }
}

function updateCachedRates(payload: CoinGeckoPriceResponse): CryptoMarketRates {
  const btcRateIdr = payload.bitcoin?.idr ?? FALLBACK_BTC_IDR;
  const ethRateIdr = payload.ethereum?.idr ?? FALLBACK_ETH_IDR;

  cachedRates = {
    btcRateIdr,
    ethRateIdr,
    btcChange24h: Number((payload.bitcoin?.idr_24h_change ?? 0).toFixed(2)),
    ethChange24h: Number((payload.ethereum?.idr_24h_change ?? 0).toFixed(2)),
    source: 'COINGECKO_LIVE',
    updatedAt: new Date().toISOString(),
  };
  cacheTimestampMs = Date.now();
  return cachedRates;
}

function getFallbackOrStaleRates(): CryptoMarketRates {
  if (cachedRates) {
    return { ...cachedRates, source: 'CACHED_COINGECKO' };
  }
  return {
    btcRateIdr: FALLBACK_BTC_IDR,
    ethRateIdr: FALLBACK_ETH_IDR,
    btcChange24h: 1.45,
    ethChange24h: 0.88,
    source: 'FALLBACK_MARKET_ESTIMATE',
    updatedAt: new Date().toISOString(),
  };
}

export async function convertIdrToCrypto(amountIdr: number): Promise<CryptoConversionResult> {
  const rates = await getMarketCryptoRates();
  const btcAmount = Number((amountIdr / rates.btcRateIdr).toFixed(8));
  const ethAmount = Number((amountIdr / rates.ethRateIdr).toFixed(8));

  return {
    ...rates,
    amountIdr,
    btcAmount,
    ethAmount,
  };
}

