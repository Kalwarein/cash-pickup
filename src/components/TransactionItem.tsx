import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, DollarSign, TrendingUp } from 'lucide-react';

interface TransactionItemProps {
  type: string;
  amount: number;
  description: string;
  date: string;
}

const typeConfig: Record<string, { icon: typeof DollarSign; color: string }> = {
  deposit: { icon: ArrowDownRight, color: 'text-green-400' },
  investment: { icon: TrendingUp, color: 'text-primary' },
  profit: { icon: ArrowUpRight, color: 'text-green-400' },
  loss: { icon: ArrowDownRight, color: 'text-red-400' },
  withdrawal: { icon: ArrowUpRight, color: 'text-orange-400' },
};

export const TransactionItem = ({ type, amount, description, date }: TransactionItemProps) => {
  const config = typeConfig[type] || typeConfig.deposit;
  const Icon = config.icon;
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center bg-muted",
        )}>
          <Icon className={cn("w-5 h-5", config.color)} />
        </div>
        <div>
          <p className="font-medium capitalize">{type}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn(
          "font-semibold",
          type === 'profit' || type === 'deposit' ? 'text-green-400' : 
          type === 'loss' ? 'text-red-400' : 'text-foreground'
        )}>
          {type === 'profit' || type === 'deposit' ? '+' : '-'}${Math.abs(amount).toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(date).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};
