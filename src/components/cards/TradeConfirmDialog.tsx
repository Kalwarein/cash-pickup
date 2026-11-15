import { AlertTriangle, ArrowDownRight, ArrowUpRight, BadgeCheck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatLeCredits } from '@/lib/card-currency';

interface TradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'buy' | 'sell';
  cardTitle: string;
  cardCode: string;
  quote: number;
  balance: number;
  isPending: boolean;
  onConfirm: () => void;
}

export const TradeConfirmDialog = ({
  open,
  onOpenChange,
  mode,
  cardTitle,
  cardCode,
  quote,
  balance,
  isPending,
  onConfirm,
}: TradeConfirmDialogProps) => {
  const isBuy = mode === 'buy';
  const canAfford = !isBuy || balance >= quote;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl border-border/80 bg-card p-0 shadow-modal">
        <div className="p-5 sm:p-6">
          <DialogHeader className="text-left">
            <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${isBuy ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
              {isBuy ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
            </div>
            <DialogTitle className="font-display text-xl font-extrabold">Review {isBuy ? 'purchase' : 'sale'}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Confirm the live quote for this fictional collectible. The server will record the final quote and update your simulated-credit balance.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 rounded-2xl border border-border/70 bg-background/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{cardTitle}</p>
                <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground">{cardCode}</p>
              </div>
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-label="Fictional collectible" />
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{isBuy ? 'You pay' : 'You receive at quote'}</p>
                <p className="mt-1 font-display text-xl font-extrabold tabular-nums">{formatLeCredits(quote)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Available</p>
                <p className="mt-1 inline-flex items-center gap-1 font-semibold tabular-nums"><Wallet className="h-3.5 w-3.5 text-muted-foreground" />{formatLeCredits(balance)}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2.5 rounded-xl bg-warning/10 p-3 text-xs leading-relaxed text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>{isBuy ? 'A card’s quote may rise or fall after purchase. This purchase uses simulated Le credits only; they cannot be withdrawn or redeemed.' : 'The payout uses the market’s live quote when the server processes your sale. The quote may be below your purchase price. Proceeds are simulated Le credits only.'}</p>
          </div>

          {!canAfford && (
            <p className="mt-3 text-sm font-semibold text-destructive">Your simulated Le-credit balance is below this quote.</p>
          )}
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2 border-t border-border/60 bg-muted/20 p-4 sm:p-5">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Not now</Button>
          <Button type="button" onClick={onConfirm} disabled={isPending || !canAfford}>
            {isPending ? 'Processing…' : isBuy ? 'Confirm purchase' : 'Confirm sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
