import { useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Building2, Flame, Activity } from 'lucide-react';
import { useCPR } from '@/hooks/useCPR';
import { useCompanies } from '@/hooks/useCompanies';
import { CPRIndicator } from '@/components/CPRIndicator';
import { RiskWarning } from '@/components/RiskWarning';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'positive' | 'negative' | 'stable';

export const MarketTab = () => {
  const { companies: cprCompanies, topPerformers, positiveCompanies, negativeCompanies, stableCompanies, averageCPR, loading } = useCPR();
  const { setSelectedCompanyId } = useCompanies();
  const [filter, setFilter] = useState<FilterType>('all');

  const getFilteredCompanies = () => {
    switch (filter) {
      case 'positive':
        return positiveCompanies;
      case 'negative':
        return negativeCompanies;
      case 'stable':
        return stableCompanies;
      default:
        return cprCompanies;
    }
  };

  const filteredCompanies = getFilteredCompanies();

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="glass-card p-6 h-40 loading-pulse" />
        <div className="glass-card p-4 h-60 loading-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Company Performance Rate</h1>
        <p className="text-muted-foreground text-sm">Daily performance outcomes that affect your investments</p>
      </div>

      {/* Risk Warning */}
      <RiskWarning variant="compact" />

      {/* Market Overview Card */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Platform Average CPR</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-4xl font-bold",
                averageCPR >= 0 ? "text-success" : "text-destructive"
              )}>
                {averageCPR >= 0 ? '+' : ''}{averageCPR.toFixed(1)}%
              </p>
              {averageCPR >= 0 ? (
                <TrendingUp className="w-6 h-6 text-success" />
              ) : (
                <TrendingDown className="w-6 h-6 text-destructive" />
              )}
            </div>
          </div>
          <CPRIndicator value={averageCPR} size="lg" showLabel />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-success mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="font-bold">{positiveCompanies.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Positive</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-destructive mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="font-bold">{negativeCompanies.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Negative</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-primary mb-1">
              <Building2 className="w-4 h-4" />
              <span className="font-bold">{cprCompanies.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>

      {/* What is CPR Info */}
      <div className="glass-card p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary">What is CPR?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Company Performance Rate is the daily outcome that determines investment returns at maturity. 
              CPR ranges from -90% to +50%. Negative rates result in losses. Only invest what you can afford to lose.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All Companies', icon: Building2 },
          { key: 'positive', label: 'Positive CPR', icon: TrendingUp },
          { key: 'negative', label: 'Negative CPR', icon: TrendingDown },
          { key: 'stable', label: 'Low Volatility', icon: Activity },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as FilterType)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              filter === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Companies List */}
      <div className="space-y-3">
        {filteredCompanies.length > 0 ? (
          filteredCompanies.map((company, index) => (
            <button
              key={company.id}
              onClick={() => setSelectedCompanyId(company.id)}
              className="w-full glass-card p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  {index + 1}
                </div>
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {company.ticker.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{company.name}</p>
                    {company.is_trending && <Flame className="w-4 h-4 text-warning" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{company.ticker}</span>
                    <span>•</span>
                    <span>{company.sector}</span>
                    <span>•</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium",
                      company.risk_level === 'Low' && "bg-success/20 text-success",
                      company.risk_level === 'Medium' && "bg-warning/20 text-warning",
                      company.risk_level === 'High' && "bg-destructive/20 text-destructive"
                    )}>
                      {company.risk_level}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <CPRIndicator value={company.cpr_today} size="md" />
                  <div className="text-xs text-muted-foreground mt-1">
                    7d: {company.cpr_7day_avg >= 0 ? '+' : ''}{company.cpr_7day_avg.toFixed(1)}%
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No companies found in this category
          </div>
        )}
      </div>
    </div>
  );
};
