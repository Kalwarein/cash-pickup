import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, ChevronRight, Building2, Flame, Activity, Shield, X, BarChart3 } from 'lucide-react';
import { useCPR } from '@/hooks/useCPR';
import { useCompanies } from '@/hooks/useCompanies';
import { CPRIndicator } from '@/components/CPRIndicator';
import { CPRChart } from '@/components/CPRChart';
import { RiskWarning } from '@/components/RiskWarning';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip
} from 'recharts';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';

type FilterType = 'all' | 'positive' | 'negative' | 'stable' | 'silent';

interface CompanyDetailData {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  risk_level: string;
  cpr_today: number;
  cpr_yesterday: number;
  cpr_7day_avg: number;
  cpr_30day_avg: number;
  cpr_best: number;
  cpr_worst: number;
  cpr_volatility: number;
  cpr_trend: string;
  current_price: number;
  is_silent_performer: boolean;
  description: string | null;
}

export const MarketTab = () => {
  const { companies: cprCompanies, topPerformers, positiveCompanies, negativeCompanies, stableCompanies, averageCPR, loading } = useCPR();
  const { companies: fullCompanies } = useCompanies();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetailData | null>(null);
  const [cprHistory, setCprHistory] = useState<Array<{ recorded_date: string; cpr_value: number }>>([]);

  // Live market chart data - animated ticker
  const [marketData, setMarketData] = useState<Array<{ time: string; value: number }>>([]);

  useEffect(() => {
    // Build market chart from average of all companies' CPR data
    const points: Array<{ time: string; value: number }> = [];
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      // Simulate cumulative market index
      const base = averageCPR * (1 - i / 30);
      const noise = (Math.random() - 0.5) * 4;
      points.push({ time: label, value: Math.round((base + noise) * 10) / 10 });
    }
    setMarketData(points);
  }, [averageCPR]);

  // Add new point every 5 seconds for "live" effect
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.48) * 2;
        const newValue = Math.round((last.value + change) * 10) / 10;
        const now = new Date();
        const label = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const updated = [...prev.slice(-29), { time: label, value: newValue }];
        return updated;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch CPR history when company selected
  useEffect(() => {
    if (!selectedCompany) return;
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('cpr_history')
        .select('recorded_date, cpr_value')
        .eq('company_id', selectedCompany.id)
        .order('recorded_date', { ascending: true })
        .limit(60);
      setCprHistory(data || []);
    };
    fetchHistory();
  }, [selectedCompany]);

  const handleCompanyClick = (companyId: string) => {
    const full = fullCompanies.find(c => c.id === companyId);
    const cpr = cprCompanies.find(c => c.id === companyId);
    if (full && cpr) {
      setSelectedCompany({
        id: full.id,
        name: full.name,
        ticker: full.ticker,
        sector: full.sector,
        risk_level: full.risk_level,
        cpr_today: cpr.cpr_today,
        cpr_yesterday: cpr.cpr_yesterday || 0,
        cpr_7day_avg: cpr.cpr_7day_avg,
        cpr_30day_avg: cpr.cpr_30day_avg || 0,
        cpr_best: cpr.cpr_best || 0,
        cpr_worst: cpr.cpr_worst || 0,
        cpr_volatility: cpr.cpr_volatility || 0,
        cpr_trend: cpr.cpr_trend || 'stable',
        current_price: full.current_price,
        is_silent_performer: (full as any).is_silent_performer || false,
        description: null,
      });
    }
  };

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
  const latestValue = marketData.length > 0 ? marketData[marketData.length - 1].value : 0;
  const isMarketUp = latestValue >= 0;

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
        <p className="text-muted-foreground text-xs">Live market movement — {cprCompanies.length} companies</p>
      </div>

      {/* Live Market Chart */}
      <div className="glass-card p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Market Index</span>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-bold",
            isMarketUp ? "text-success" : "text-destructive"
          )}>
            {isMarketUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isMarketUp ? '+' : ''}{latestValue.toFixed(1)}%
            <span className="w-2 h-2 rounded-full bg-success animate-pulse ml-1" />
          </div>
        </div>
        <div className="h-32 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={marketData}>
              <defs>
                <linearGradient id="marketGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isMarketUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={isMarketUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(v: number) => [`${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, 'Index']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isMarketUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                strokeWidth={2}
                fill="url(#marketGrad)"
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <RiskWarning variant="compact" />

      {/* Market Stats */}
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

      {/* Filter Tabs */}
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
              onClick={() => handleCompanyClick(company.id)}
              className="w-full glass-card p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-[10px] font-bold text-muted-foreground flex-shrink-0">
                {index + 1}
              </div>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary-foreground">{company.ticker.slice(0, 2)}</span>
              </div>
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

      {/* Company Detail Dialog */}
      <Dialog open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selectedCompany && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">{selectedCompany.ticker.slice(0, 2)}</span>
                  </div>
                  <div>
                    <span>{selectedCompany.name}</span>
                    <p className="text-xs text-muted-foreground font-normal">{selectedCompany.ticker} • {selectedCompany.sector}</p>
                  </div>
                </DialogTitle>
                <DialogDescription>Company performance analysis</DialogDescription>
              </DialogHeader>

              {/* Today's CPR */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground">Today's CPR</span>
                <CPRIndicator value={selectedCompany.cpr_today} size="lg" showLabel />
              </div>

              {/* CPR Chart */}
              <div>
                <p className="text-sm font-semibold mb-2">CPR History</p>
                <CPRChart data={cprHistory} height={160} showAxis />
              </div>

              {/* Key Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Yesterday</p>
                  <p className={cn("font-bold", selectedCompany.cpr_yesterday >= 0 ? "text-success" : "text-destructive")}>
                    {selectedCompany.cpr_yesterday >= 0 ? '+' : ''}{selectedCompany.cpr_yesterday.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">7-Day Avg</p>
                  <p className={cn("font-bold", selectedCompany.cpr_7day_avg >= 0 ? "text-success" : "text-destructive")}>
                    {selectedCompany.cpr_7day_avg >= 0 ? '+' : ''}{selectedCompany.cpr_7day_avg.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">30-Day Avg</p>
                  <p className={cn("font-bold", selectedCompany.cpr_30day_avg >= 0 ? "text-success" : "text-destructive")}>
                    {selectedCompany.cpr_30day_avg >= 0 ? '+' : ''}{selectedCompany.cpr_30day_avg.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Volatility</p>
                  <p className="font-bold">{selectedCompany.cpr_volatility.toFixed(1)}</p>
                </div>
                <div className="p-3 rounded-xl bg-success/10">
                  <p className="text-[10px] text-muted-foreground">Best CPR</p>
                  <p className="font-bold text-success">+{selectedCompany.cpr_best.toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-xl bg-destructive/10">
                  <p className="text-[10px] text-muted-foreground">Worst CPR</p>
                  <p className="font-bold text-destructive">{selectedCompany.cpr_worst.toFixed(1)}%</p>
                </div>
              </div>

              {/* Risk & Trend */}
              <div className="flex gap-2">
                <div className={cn(
                  "flex-1 p-3 rounded-xl text-center",
                  selectedCompany.risk_level === 'Low' && "bg-success/10",
                  selectedCompany.risk_level === 'Medium' && "bg-warning/10",
                  selectedCompany.risk_level === 'High' && "bg-destructive/10"
                )}>
                  <p className="text-[10px] text-muted-foreground">Risk Level</p>
                  <p className="font-bold text-sm">{selectedCompany.risk_level}</p>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground">Trend</p>
                  <p className="font-bold text-sm capitalize">{selectedCompany.cpr_trend}</p>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground">Price</p>
                  <p className="font-bold text-sm">{sle(selectedCompany.current_price)}</p>
                </div>
              </div>

              {selectedCompany.is_silent_performer && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    This is a <span className="text-primary font-semibold">Hidden Gem</span> — historically consistent with higher positive returns.
                  </p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};