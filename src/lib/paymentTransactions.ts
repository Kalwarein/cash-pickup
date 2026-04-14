import type { PaymentTransaction } from '@/hooks/usePaymentTransactions';

export type PaymentStatusFilter = 'all' | 'pending' | 'completed' | 'failed' | 'expired';

export const PROVIDER_LABELS: Record<string, string> = {
  m17: 'Orange Money',
  m18: 'Afrimoney',
};

const COMPLETED_STATUSES = new Set(['completed', 'success', 'successful', 'processed']);
const FAILED_STATUSES = new Set(['failed', 'cancelled', 'canceled']);

export const getMetadataString = (metadata: Record<string, unknown> | null, key: string) => {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : null;
};

export const getNestedMetadata = (metadata: Record<string, unknown> | null, key: string) => {
  const value = metadata?.[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

export const getPaymentExpiry = (tx: PaymentTransaction) => {
  return getMetadataString(tx.metadata, 'expireTime')
    || getMetadataString(tx.metadata, 'expires_at')
    || getMetadataString(getNestedMetadata(tx.metadata, 'webhook_data'), 'expireTime');
};

export const getResolvedPaymentStatus = (tx: PaymentTransaction): Exclude<PaymentStatusFilter, 'all'> => {
  const normalizedStatus = tx.status.toLowerCase();

  if (COMPLETED_STATUSES.has(normalizedStatus)) {
    return 'completed';
  }

  if (FAILED_STATUSES.has(normalizedStatus)) {
    return 'failed';
  }

  const expiresAt = getPaymentExpiry(tx);
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return 'expired';
  }

  return 'pending';
};

export const getPaymentBadge = (tx: PaymentTransaction) => {
  const resolvedStatus = getResolvedPaymentStatus(tx);

  if (resolvedStatus === 'completed') {
    return { label: 'Completed', className: 'bg-success/20 text-success' };
  }

  if (resolvedStatus === 'failed') {
    return { label: 'Failed', className: 'bg-destructive/15 text-destructive' };
  }

  if (resolvedStatus === 'expired') {
    return { label: 'Expired', className: 'bg-warning/20 text-warning' };
  }

  if (tx.status.toLowerCase() === 'processing') {
    return { label: 'Processing', className: 'bg-primary/15 text-primary' };
  }

  return { label: 'Pending', className: 'bg-primary/15 text-primary' };
};

export const matchesPaymentStatusFilter = (tx: PaymentTransaction, filter: PaymentStatusFilter) => {
  if (filter === 'all') return true;
  return getResolvedPaymentStatus(tx) === filter;
};