import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard = ({ label, value, change, icon, className }: StatCardProps) => {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <div className={cn("stat-card", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-xl font-bold">{value}</span>
        {change !== undefined && (
          <span className={cn(
            "text-sm font-medium",
            isPositive ? "text-green-400" : "text-red-400"
          )}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
};
