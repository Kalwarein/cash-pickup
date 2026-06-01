import { useEffect, useState } from 'react';
import { PhoneCall, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { PaymentTransaction } from '@/hooks/usePaymentTransactions';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  PROVIDER_LABELS,
  getMetadataString,
  getNestedMetadata,
  getPaymentBadge,
  getPaymentExpiry,
} from '@/lib/paymentTransactions';

interface PaymentTransactionDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: PaymentTransaction | null;
}

export const PaymentTransactionDetails = ({
  open,
  onOpenChange,
  transaction,
}: PaymentTransactionDetailsProps) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{transaction?.type === 'withdrawal' ? 'Withdrawal Details' : 'Deposit Details'}</DrawerTitle>
          <DrawerDescription>
            Review payment code validity, provider info, and transaction references
          </DrawerDescription>
        </DrawerHeader>

        {transaction && (() => {
          const badge = getPaymentBadge(transaction);
          const expiresAt = getPaymentExpiry(transaction);
          const processedPaymentData = getNestedMetadata(transaction.metadata, 'processedPaymentData');
          const webhookData = getNestedMetadata(transaction.metadata, 'webhook_data');
          const channelData = getNestedMetadata(processedPaymentData, 'channelData');
          const provider = transaction.provider
            ? (PROVIDER_LABELS[transaction.provider] || transaction.provider)
            : 'Mobile Money';
          const expiryMs = expiresAt ? new Date(expiresAt).getTime() : 0;
          const remainingMs = Math.max(0, expiryMs - now);
          const remainingMin = Math.floor(remainingMs / 60000);
          const remainingSec = Math.floor((remainingMs % 60000) / 1000);
          const codeLive = transaction.type === 'deposit'
            && transaction.ussd_code
            && transaction.status === 'pending'
            && remainingMs > 0;

          return (
            <div className="max-h-[65vh] space-y-4 overflow-y-auto px-4 pb-6">
              <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-2xl font-bold">{sle(transaction.amount)}</p>
                  </div>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', badge.className)}>
                    {badge.label}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {transaction.type === 'deposit'
                    ? 'This request credits the wallet after the payment code is confirmed.'
                    : 'This request is sent to the selected mobile wallet and updates automatically when confirmed.'}
                </p>
              </div>

              {transaction.type === 'deposit' && transaction.ussd_code && (
                <div className="rounded-2xl border border-border/60 bg-card/70 p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">USSD Code</p>
                  <p className={cn('text-2xl font-bold tracking-wider',
                    codeLive ? 'text-primary' : 'text-muted-foreground line-through')}>
                    {transaction.ussd_code}
                  </p>
                  {expiresAt && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-mono tabular-nums">
                        {codeLive
                          ? `${remainingMin.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')} remaining`
                          : 'Code expired'}
                      </span>
                    </div>
                  )}
                  {codeLive ? (
                    <a
                      href={`tel:${encodeURIComponent(transaction.ussd_code)}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-success text-success-foreground font-semibold"
                    >
                      <PhoneCall className="w-4 h-4" />
                      Pay Now
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">This payment code can no longer be used. Start a new deposit from your wallet.</p>
                  )}
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 text-sm">
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Provider</span><span>{provider}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Phone</span><span>{transaction.phone_number || 'Not provided'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Reference</span><span className="break-all text-right">{transaction.reference || '—'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Created</span><span>{new Date(transaction.created_at).toLocaleString()}</span></div>
                {expiresAt && (
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Expires</span><span>{new Date(expiresAt).toLocaleString()}</span></div>
                )}
                {transaction.ussd_code && (
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">USSD Code</span><span>{transaction.ussd_code}</span></div>
                )}
                {transaction.monime_payment_code_id && (
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Payment Code ID</span><span className="break-all text-right">{transaction.monime_payment_code_id}</span></div>
                )}
                {transaction.monime_payout_id && (
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Payout ID</span><span className="break-all text-right">{transaction.monime_payout_id}</span></div>
                )}
              </div>

              {(processedPaymentData || webhookData) && (
                <div className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 text-sm">
                  <p className="font-semibold">Processor Details</p>
                  {getMetadataString(processedPaymentData, 'paymentId') && (
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Payment ID</span><span className="break-all text-right">{getMetadataString(processedPaymentData, 'paymentId')}</span></div>
                  )}
                  {getMetadataString(processedPaymentData, 'financialTransactionReference') && (
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">Financial Ref</span><span className="break-all text-right">{getMetadataString(processedPaymentData, 'financialTransactionReference')}</span></div>
                  )}
                  {channelData && (
                    <>
                      {getMetadataString(channelData, 'providerId') && (
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Channel Provider</span><span>{getMetadataString(channelData, 'providerId')}</span></div>
                      )}
                      {getMetadataString(channelData, 'reference') && (
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Channel Ref</span><span className="break-all text-right">{getMetadataString(channelData, 'reference')}</span></div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </DrawerContent>
    </Drawer>
  );
};