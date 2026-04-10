import { useState } from 'react';
import { TrendingUp, TrendingDown, ChevronRight, Building2, Flame, Activity, Shield } from 'lucide-react';
import { useCPR } from '@/hooks/useCPR';
import { useCompanies } from '@/hooks/useCompanies';
import { CPRIndicator } from '@/components/CPRIndicator';
import { RiskWarning } from '@/components/RiskWarning';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'positive' | 'negative' | 'stable' | 'silent';

export const MarketTab = () => {
  const { companies: cprCompanies, topPerformers, positiveCompanies, negativeCompanies, stableCompanies, averageCPR, loading } = useCPR();
  const { setSelectedCompanyId } = useCompanies();
  const [filter, setFilter] = useState<FilterType>('all');

  const getFilteredCompanies = () => {
    switch (filter) {
      case 'positive': return positiveCompanies;
      case 'negative': return negativeCompanies;
      case 'stable': return stableCompanies;
      case 'silent': return cprCompanies.filter(c => (c as any).is_silent_performer);
      default: return cprCompanies;
    }
  };

  const filteredCompanies = getFilteredCompanies();

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="glass-card p-6 h-32 loading-pulse" />
        <div className="glass-card p-4 h-40 loading-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Market Overview</h1>
        <p className="text-muted-foreground text-xs">Company Performance Rate — {cprCompanies.length} companies</p>
      </div>

      <RiskWarning variant="compact" />

      {/* Market Overview - Compact */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Platform Average CPR</p>
            <div className="flex items-center gap-2">
              <p className={cn("text-2xl font-bold", averageCPR >= 0 ? "text-success" : "text-destructive")}>
                {averageCPR >= 0 ? '+' : ''}{averageCPR.toFixed(1)}%
              </p>
              {averageCPR >= 0 ? <TrendingUp className="w-5 h-5 text-success" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
            </div>
          </div>
          <CPRIndicator value={averageCPR} size="lg" showLabel />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-success mb-0.5">
              <TrendingUp className="w-3 h-3" />
              <span className="font-bold text-sm">{positiveCompanies.length}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Positive</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-destructive mb-0.5">
              <TrendingDown className="w-3 h-3" />
              <span className="font-bold text-sm">{negativeCompanies.length}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Negative</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
              <Building2 className="w-3 h-3" />
              <span className="font-bold text-sm">{cprCompanies.length}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs - Scrollable */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {[
          { key: 'all', label: 'All', icon: Building2 },
          { key: 'positive', label: 'Positive', icon: TrendingUp },
          { key: 'negative', label: 'Negative', icon: TrendingDown },
          { key: 'stable', label: 'Stable', icon: Activity },
          { key: 'silent', label: 'Hidden Gems', icon: Shield },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as FilterType)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
              filter === key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Companies List */}
      <div className="space-y-2">
        {filteredCompanies.length > 0 ? (
          filteredCompanies.map((company, index) => (
            <button
              key={company.id}
              onClick={() => setSelectedCompanyId(company.id)}
              className="w-full glass-card p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-[10px] font-bold text-muted-foreground flex-shrink-0">
                {index + 1}
              </div>

              {/* Ticker Icon */}
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary-foreground">{company.ticker.slice(0, 2)}</span>
              </div>

              {/* Company Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-medium text-sm truncate">{company.name}</p>
                  {company.is_trending && <Flame className="w-3 h-3 text-warning flex-shrink-0" />}
                  {(company as any).is_silent_performer && <Shield className="w-3 h-3 text-primary flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
                  <span>{company.ticker}</span>
                  <span>•</span>
                  <span className="truncate">{company.sector}</span>
                  <span>•</span>
                  <span className={cn(
                    "px-1 py-0.5 rounded text-[9px] font-medium",
                    company.risk_level === 'Low' && "bg-success/20 text-success",
                    company.risk_level === 'Medium' && "bg-warning/20 text-warning",
                    company.risk_level === 'High' && "bg-destructive/20 text-destructive"
                  )}>
                    {company.risk_level}
                  </span>
                </div>
              </div>

              {/* CPR + Arrow */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <CPRIndicator value={company.cpr_today} size="md" />
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    7d: {company.cpr_7day_avg >= 0 ? '+' : ''}{company.cpr_7day_avg.toFixed(1)}%
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">No companies found</div>
        )}
      </div>
    </div>
  );
};
