import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, RefreshCw, Coins } from 'lucide-react';
import { sle } from '@/lib/currency';

interface TransactionItemProps {
  type: string;
  amount: number;
  description: string;
  date: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'deposit':
      return <ArrowDownLeft className="w-4 h-4 text-success" />;
    case 'investment':
      return <ArrowUpRight className="w-4 h-4 text-primary" />;
    case 'investment_profit':
    case 'trade_profit':
      return <TrendingUp className="w-4 h-4 text-success" />;
    case 'investment_loss':
    case 'trade_loss':
      return <TrendingDown className="w-4 h-4 text-destructive" />;
    case 'trade_open':
      return <Coins className="w-4 h-4 text-warning" />;
    default:
      return <RefreshCw className="w-4 h-4" />;
  }
};

export const TransactionItem = forwardRef<HTMLDivElement, TransactionItemProps>(
  ({ type, amount, description, date }, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            {getIcon(type)}
          </div>
          <div>
            <p className="text-sm font-medium">{description || type.replace('_', ' ')}</p>
            <p className="text-xs text-muted-foreground capitalize">{type.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn(
            "font-semibold",
            (type === 'profit' || type === 'deposit' || type === 'trade_profit' || type === 'investment_profit') ? 'text-success' : 
            (type === 'loss' || type === 'trade_loss' || type === 'investment_loss') ? 'text-destructive' : 'text-foreground'
          )}>
            {amount >= 0 ? '+' : ''}{sle(amount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(date).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }
);

TransactionItem.displayName = 'TransactionItem';
