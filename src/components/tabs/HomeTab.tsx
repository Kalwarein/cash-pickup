import { TrendingUp, Users, Activity, Flame, Clock, Calendar } from 'lucide-react';
import { MarketChart } from '@/components/MarketChart';
import { StatCard } from '@/components/StatCard';
import { useMarketSimulation } from '@/hooks/useMarketSimulation';
import { useCompanies } from '@/hooks/useCompanies';
import { useInvestments } from '@/hooks/useInvestments';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

export const HomeTab = () => {
  const { chartData, marketStatus } = useMarketSimulation();
  const { companies } = useCompanies();
  const { investments } = useInvestments();

  const trendingCompanies = companies.filter(c => c.is_trending).slice(0, 4);
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalProfitLoss = investments.reduce((sum, inv) => sum + inv.profit_loss, 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);

  const getDaysRemaining = (maturityDate: string) => {
    const now = new Date();
    const maturity = new Date(maturityDate);
    const diff = Math.ceil((maturity.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Pickup</h1>
          <p className="text-muted-foreground text-sm">Welcome back, investor</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2",
            marketStatus.status === 'rising' && "bg-success/20 text-success",
            marketStatus.status === 'falling' && "bg-destructive/20 text-destructive",
            marketStatus.status === 'volatile' && "bg-warning/20 text-warning"
          )}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {marketStatus.message}
          </div>
        </div>
      </div>

      {/* Market Chart */}
      <div className="glass-card p-4 glow-primary">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Market Index</p>
            <p className="text-3xl font-bold">
              ${chartData[chartData.length - 1]?.value.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className={cn(
            "text-right",
            marketStatus.sentiment >= 0 ? "text-success" : "text-destructive"
          )}>
            <p className="text-lg font-semibold">
              {marketStatus.sentiment >= 0 ? '+' : ''}{marketStatus.sentiment.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">24h Sentiment</p>
          </div>
        </div>
        <MarketChart data={chartData} height={180} />
      </div>

      {/* My Investments Section */}
      {investments.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Investments</h2>
            <span className="text-sm text-muted-foreground">{investments.length} active</span>
          </div>
          
          {/* Portfolio Summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground">Total Invested</p>
              <p className="text-lg font-bold">${totalInvested.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground">Current Value</p>
              <p className={cn(
                "text-lg font-bold",
                totalCurrentValue >= totalInvested ? "text-success" : "text-destructive"
              )}>
                ${totalCurrentValue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Investment Cards */}
          <div className="space-y-3">
            {investments.slice(0, 4).map((inv) => {
              const daysRemaining = getDaysRemaining(inv.maturity_date);
              const profitPercent = inv.amount > 0 ? (inv.profit_loss / inv.amount) * 100 : 0;
              
              return (
                <div key={inv.id} className="p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-foreground">
                          {inv.company_ticker?.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{inv.company_name}</p>
                        <p className="text-xs text-muted-foreground">{inv.company_ticker}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${inv.current_value.toFixed(2)}</p>
                      <p className={cn(
                        "text-sm font-medium",
                        inv.profit_loss >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {inv.profit_loss >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Maturity Progress */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            daysRemaining <= 0 ? "bg-success" : "bg-primary"
                          )}
                          style={{ 
                            width: `${Math.min(100, ((inv.maturity_days - daysRemaining) / inv.maturity_days) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                    <span className={cn(
                      "text-xs font-medium",
                      daysRemaining <= 0 ? "text-success" : "text-muted-foreground"
                    )}>
                      {daysRemaining <= 0 ? 'Matured!' : `${daysRemaining}d left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Users"
          value="2,847"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Active Investments"
          value={investments.length.toString()}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Your Portfolio"
          value={`$${totalInvested.toFixed(0)}`}
          change={totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0}
        />
        <StatCard
          label="Market Activity"
          value="High"
          icon={<Activity className="w-4 h-4" />}
        />
      </div>

      {/* Trending Companies */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold">Trending Now</h2>
        </div>
        <div className="space-y-3">
          {trendingCompanies.map((company) => (
            <div 
              key={company.id}
              className="glass-card p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {company.ticker.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{company.name}</p>
                  <p className="text-xs text-muted-foreground">{company.sector}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">${company.current_price.toFixed(2)}</p>
                <p className={cn(
                  "text-sm",
                  company.price_change_percent >= 0 ? "text-success" : "text-destructive"
                )}>
                  {company.price_change_percent >= 0 ? '+' : ''}
                  {company.price_change_percent.toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
