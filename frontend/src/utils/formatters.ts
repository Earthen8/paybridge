export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCrypto(amount: number | string, symbol: 'BTC' | 'ETH'): string {
  const numericValue = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(numericValue)) {
    return `0.00000000 ${symbol}`;
  }
  return `${numericValue.toFixed(8)} ${symbol}`;
}

export function formatDateTime(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return '-';
  }
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoDate));
}

export function formatDateOnly(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return '-';
  }
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(isoDate));
}

