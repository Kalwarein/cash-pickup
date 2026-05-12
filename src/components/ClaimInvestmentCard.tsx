import { useState } from 'react';
import { Check, Clock, TrendingUp, TrendingDown, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNotify } from '@/contexts/NotificationContext';

interface ClaimInvestmentCardProps {
  investment: {
    id: string;
    amount: number;
    company_name: string | null;
    company_ticker: string | null;
    maturity_cpr: number | null;
    final_value: number | null;
    final_profit_loss: number | null;
    is_claimed: boolean;
    matured_at: string | null;
  };
  onClaimed: () => void;
}

export const ClaimInvestmentCard = ({ investment, onClaimed }: ClaimInvestmentCardProps) => {
  const { user } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const notify = useNotify();

  const handleClaim = async () => {
    if (!user || claiming) return;
    
    setClaiming(true);
    
    try {
      const finalValue = investment.final_value || investment.amount;
      const profitLoss = investment.final_profit_loss || 0;
      
      // Get current wallet
      const { data: wallet, error: walletErr } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (walletErr || !wallet) {
        toast.error('Wallet not found. Please reload the app.');
        return;
      }
      
      // Update wallet balance
      const newBalance = Number(wallet.balance) + finalValue;
      const newProfit = profitLoss > 0 ? Number(wallet.total_profit) + profitLoss : Number(wallet.total_profit);
      const newLoss = profitLoss < 0 ? Number(wallet.total_loss) + Math.abs(profitLoss) : Number(wallet.total_loss);
      
      const { error: updErr } = await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          invested_amount: Math.max(0, Number(wallet.invested_amount) - investment.amount),
          total_profit: newProfit,
          total_loss: newLoss,
        })
        .eq('user_id', user.id);
      if (updErr) {
        toast.error(`Wallet update failed: ${updErr.message}`);
        return;
      }
      
      // Mark investment as claimed
      const { error: invErr } = await supabase
        .from('investments')
        .update({
          is_claimed: true,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', investment.id);
      if (invErr) {
        toast.error(`Could not mark investment as claimed: ${invErr.message}`);
        return;
      }
      
      // Record transaction
      const transactionType = profitLoss >= 0 ? 'investment_profit' : 'investment_loss';
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: transactionType,
          amount: finalValue,
          description: `Claimed ${investment.company_name ?? 'investment'}: ${profitLoss >= 0 ? '+' : ''}${sle(profitLoss)}`,
        });
      
      if (profitLoss >= 0) {
        notify({
          tone: 'success',
          title: `+${sle(profitLoss)} added to your wallet`,
          body: `Total credited: ${sle(finalValue)} from ${investment.company_name ?? investment.company_ticker ?? 'investment'}.`,
        });
      } else {
        notify({
          tone: 'error',
          title: `−${sle(Math.abs(profitLoss))} deducted from your investment`,
          body: `Returned to wallet: ${sle(finalValue)}. Better luck next time.`,
        });
      }
      onClaimed();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to claim investment: ${msg}`);
    } finally {
      setClaiming(false);
    }
  };

  const profitLoss = investment.final_profit_loss || 0;
  const finalValue = investment.final_value || investment.amount;
  const isProfit = profitLoss >= 0;

  if (investment.is_claimed) {
    return (
      <div className="glass-card p-4 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-medium">{investment.company_name}</p>
              <p className="text-xs text-muted-foreground">Claimed</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{sle(finalValue)}</p>
            <p className={cn("text-sm", isProfit ? "text-success" : "text-destructive")}>
              {isProfit ? '+' : ''}{sle(profitLoss)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "glass-card p-4 border-2 animate-pulse-slow",
      isProfit ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            isProfit ? "bg-success/20" : "bg-destructive/20"
          )}>
            {isProfit ? (
              <TrendingUp className="w-6 h-6 text-success" />
            ) : (
              <TrendingDown className="w-6 h-6 text-destructive" />
            )}
          </div>
          <div>
            <p className="font-semibold">{investment.company_name}</p>
            <p className="text-xs text-muted-foreground">{investment.company_ticker}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Maturity CPR</p>
          <p className={cn(
            "font-semibold",
            (investment.maturity_cpr || 0) >= 0 ? "text-success" : "text-destructive"
          )}>
            {(investment.maturity_cpr || 0) >= 0 ? '+' : ''}{(investment.maturity_cpr || 0).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-muted/50 rounded-xl">
          <p className="text-xs text-muted-foreground">Invested</p>
          <p className="font-semibold">{sle(investment.amount)}</p>
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          isProfit ? "bg-success/10" : "bg-destructive/10"
        )}>
          <p className="text-xs text-muted-foreground">Final Value</p>
          <p className="font-semibold">{sle(finalValue)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift className={cn("w-4 h-4", isProfit ? "text-success" : "text-destructive")} />
          <span className={cn(
            "text-lg font-bold",
            isProfit ? "text-success" : "text-destructive"
          )}>
            {isProfit ? '+' : ''}{sle(profitLoss)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {investment.matured_at ? new Date(investment.matured_at).toLocaleDateString() : 'Matured'}
        </span>
      </div>

      <button
        onClick={handleClaim}
        disabled={claiming}
        className={cn(
          "w-full py-3 rounded-xl font-semibold transition-all",
          isProfit
            ? "bg-success text-success-foreground hover:bg-success/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
          claiming && "opacity-50 cursor-not-allowed"
        )}
      >
        {claiming ? 'Claiming...' : 'Claim Now'}
      </button>
    </div>
  );
};
