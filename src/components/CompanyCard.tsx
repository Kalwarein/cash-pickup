import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Flame, Eye } from 'lucide-react';

interface CompanyCardProps {
  name: string;
  ticker: string;
  sector: string;
  price: number;
  change: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  isTrending?: boolean;
  onInvest?: () => void;
  onView?: () => void;
}

export const CompanyCard = ({
  name,
  ticker,
  sector,
  price,
  change,
  riskLevel,
  isTrending,
  onInvest,
  onView,
}: CompanyCardProps) => {
  const isPositive = change >= 0;
  
  return (
    <div className="glass-card p-4 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{name}</h3>
            {isTrending && (
              <Flame className="w-4 h-4 text-orange-400" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {ticker}
            </span>
            <span className="text-xs text-muted-foreground">{sector}</span>
          </div>
        </div>
        <span className={cn(
          "text-xs px-2 py-1 rounded-full border font-medium",
          riskLevel === 'Low' && "risk-low",
          riskLevel === 'Medium' && "risk-medium",
          riskLevel === 'High' && "risk-high"
        )}>
          {riskLevel}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold">${price.toFixed(2)}</p>
          <div className={cn(
            "flex items-center gap-1 text-sm",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{isPositive ? '+' : ''}{change.toFixed(2)}%</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {onView && (
            <button
              onClick={onView}
              className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              title="View details"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onInvest}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Invest
          </button>
        </div>
      </div>
    </div>
  );
};
