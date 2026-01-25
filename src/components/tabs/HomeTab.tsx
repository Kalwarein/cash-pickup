import { useState } from 'react';
import { TrendingUp, TrendingDown, Users, Activity, Flame, Ticket, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { useCPR } from '@/hooks/useCPR';
import { useCompanies } from '@/hooks/useCompanies';
import { useInvestments } from '@/hooks/useInvestments';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CPRIndicator } from '@/components/CPRIndicator';
import { InvestmentProgressBar } from '@/components/InvestmentProgressBar';
import { RiskWarning } from '@/components/RiskWarning';
import { PromoCodeMarketplace } from '@/components/PromoCodeMarketplace';
import { cn } from '@/lib/utils';
import { formatSLE, sle } from '@/lib/currency';

export const HomeTab = () => {
  const { topPerformers, averageCPR, loading: cprLoading } = useCPR();
  const { companies } = useCompanies();
  const { investments, completedInvestments } = useInvestments();
  const [showPromoMarketplace, setShowPromoMarketplace] = useState(false);

  const trendingCompanies = companies.filter(c => c.is_trending).slice(0, 4);
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalProfitLoss = investments.reduce((sum, inv) => sum + inv.profit_loss, 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);
  
  // Calculate net profit from completed investments
  const completedProfit = completedInvestments
    .reduce((sum, inv) => sum + (inv.final_profit_loss || 0), 0);

  // Determine market status based on average CPR
  const getMarketStatus = () => {
    if (averageCPR >= 5) return { status: 'positive', message: 'Market Positive', color: 'text-success bg-success/20' };
    if (averageCPR >= -10) return { status: 'stable', message: 'Market Mixed', color: 'text-warning bg-warning/20' };
    return { status: 'negative', message: 'Market Down', color: 'text-destructive bg-destructive/20' };
  };

  const marketStatus = getMarketStatus();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Pickup</h1>
          <p className="text-muted-foreground text-sm">Welcome back, investor</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPromoMarketplace(true)}
            className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
            title="Promo Codes"
          >
            <Ticket className="w-5 h-5" />
          </button>
          <ThemeToggle />
          <div className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2",
            marketStatus.color
          )}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {marketStatus.message}
          </div>
        </div>
      </div>

      {/* Risk Warning */}
      <RiskWarning variant="inline" />

      {/* CPR Overview */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Platform Average CPR</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-3xl font-bold",
                averageCPR >= 0 ? "text-success" : "text-destructive"
              )}>
                {averageCPR >= 0 ? '+' : ''}{averageCPR.toFixed(1)}%
              </p>
              {averageCPR >= 0 ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
            </div>
          </div>
          <CPRIndicator value={averageCPR} size="lg" showLabel />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4" />
          <span>CPR determines investment outcomes at maturity. Negative CPR = potential loss.</span>
        </div>
      </div>

      {/* My Investments Section with Animated Progress */}
      {investments.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Active Investments</h2>
            <span className="text-sm text-muted-foreground">{investments.length} active</span>
          </div>
          
          {/* Portfolio Summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground">Total Invested</p>
              <p className="text-lg font-bold">{sle(totalInvested)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground">Est. Current Value</p>
              <p className={cn(
                "text-lg font-bold",
                totalCurrentValue >= totalInvested ? "text-success" : "text-destructive"
              )}>
                {sle(totalCurrentValue)}
              </p>
            </div>
          </div>

          {/* Investment Cards with Animated Progress */}
          <div className="space-y-4">
            {investments.slice(0, 4).map((inv) => {
              const profitPercent = inv.amount > 0 ? (inv.profit_loss / inv.amount) * 100 : 0;
              
              return (
                <div key={inv.id} className="p-4 bg-muted/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
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
                      <p className="font-semibold">{sle(inv.current_value)}</p>
                      <p className={cn(
                        "text-sm font-medium",
                        inv.profit_loss >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {inv.profit_loss >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Animated Maturity Progress Bar */}
                  <InvestmentProgressBar
                    maturityDate={inv.maturity_date}
                    maturityDays={inv.maturity_days}
                    createdAt={inv.created_at}
                    companyName={inv.company_name || ''}
                    amount={inv.amount}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Investments */}
      {completedInvestments.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recently Completed</h2>
            <span className={cn(
              "text-sm font-medium",
              completedProfit >= 0 ? "text-success" : "text-destructive"
            )}>
              {completedProfit >= 0 ? '+' : ''}{sle(completedProfit)} net
            </span>
          </div>
          <div className="space-y-2">
            {completedInvestments.slice(0, 3).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    (inv.final_profit_loss || 0) >= 0 ? "bg-success/20" : "bg-destructive/20"
                  )}>
                    {(inv.final_profit_loss || 0) >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-success" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                  </div>
                  <span className="text-sm">{inv.company_name}</span>
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  (inv.final_profit_loss || 0) >= 0 ? "text-success" : "text-destructive"
                )}>
                  {(inv.final_profit_loss || 0) >= 0 ? '+' : ''}{sle(inv.final_profit_loss || 0)}
                </span>
              </div>
            ))}
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
          value={`${totalInvested.toFixed(0)} SLE`}
          change={totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0}
        />
        <StatCard
          label="Market Activity"
          value="High"
          icon={<Activity className="w-4 h-4" />}
        />
      </div>

      {/* Top Performers by CPR */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-semibold">Top Performers Today</h2>
        </div>
        <div className="space-y-3">
          {topPerformers.slice(0, 4).map((company) => (
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
              <div className="flex items-center gap-3">
                <CPRIndicator value={company.cpr_today} size="md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Promo Code Marketplace Modal */}
      <PromoCodeMarketplace 
        isOpen={showPromoMarketplace} 
        onClose={() => setShowPromoMarketplace(false)} 
      />
    </div>
  );
};
