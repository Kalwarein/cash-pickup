import { useState } from 'react';
import { TrendingUp, TrendingDown, Award, Zap, Building2, Star, ChevronRight } from 'lucide-react';
import { useCPI } from '@/hooks/useCPI';
import { useCompanies } from '@/hooks/useCompanies';
import { CPIGauge } from '@/components/CPIGauge';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';

type FilterType = 'all' | 'top' | 'rising' | 'stable';

export const MarketTab = () => {
  const { companies: cpiCompanies, topPerformers, risingCompanies, stableCompanies, averageCPI, loading } = useCPI();
  const { setSelectedCompanyId } = useCompanies();
  const [filter, setFilter] = useState<FilterType>('all');

  const getFilteredCompanies = () => {
    switch (filter) {
      case 'top':
        return topPerformers;
      case 'rising':
        return risingCompanies;
      case 'stable':
        return stableCompanies;
      default:
        return cpiCompanies;
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
        <h1 className="text-2xl font-bold">Company Performance Index</h1>
        <p className="text-muted-foreground text-sm">Track company strength and investment potential</p>
      </div>

      {/* Market Overview Card */}
      <div className="glass-card p-6 glow-primary">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Market Average CPI</p>
            <p className="text-4xl font-bold">{averageCPI.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">out of 100</p>
          </div>
          <CPIGauge score={averageCPI} size="lg" />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-success mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="font-bold">{risingCompanies.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Rising</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-warning mb-1">
              <Zap className="w-4 h-4" />
              <span className="font-bold">{stableCompanies.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Stable</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-primary mb-1">
              <Building2 className="w-4 h-4" />
              <span className="font-bold">{cpiCompanies.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>

      {/* What is CPI Info */}
      <div className="glass-card p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary">What is CPI?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Company Performance Index measures company strength based on investment activity, 
              completed payouts, and investor confidence. Higher CPI indicates better performance.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All Companies', icon: Building2 },
          { key: 'top', label: 'Top Performers', icon: Star },
          { key: 'rising', label: 'Rising', icon: TrendingUp },
          { key: 'stable', label: 'Stable', icon: Zap },
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
                  <p className="font-medium">{company.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{company.ticker}</span>
                    <span>•</span>
                    <span>{company.sector}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={cn(
                    "text-lg font-bold",
                    company.cpi_score >= 70 ? "text-success" : 
                    company.cpi_score >= 50 ? "text-warning" : "text-destructive"
                  )}>
                    {company.cpi_score.toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">CPI</div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{sle(company.current_price)}</p>
                  <p className="text-xs text-success">+{company.guaranteed_return_percent}%</p>
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
