import { TrendingUp, Users, Activity, Flame } from 'lucide-react';
import { MarketChart } from '@/components/MarketChart';
import { StatCard } from '@/components/StatCard';
import { useMarketSimulation } from '@/hooks/useMarketSimulation';
import { useCompanies } from '@/hooks/useCompanies';
import { useInvestments } from '@/hooks/useInvestments';
import { cn } from '@/lib/utils';

export const HomeTab = () => {
  const { chartData, marketStatus } = useMarketSimulation();
  const { companies } = useCompanies();
  const { investments } = useInvestments();

  const trendingCompanies = companies.filter(c => c.is_trending).slice(0, 4);
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalProfitLoss = investments.reduce((sum, inv) => sum + inv.profit_loss, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Pickup</h1>
          <p className="text-muted-foreground text-sm">Welcome back, investor</p>
        </div>
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
