import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, Clock, Building2, MessageSquare, Activity, BarChart3, Lightbulb } from 'lucide-react';
import { CPRIndicator } from '@/components/CPRIndicator';
import { CPRChart } from '@/components/CPRChart';
import { RiskWarning } from '@/components/RiskWarning';
import { useCPRHistory } from '@/hooks/useCPR';
import { useCompanyActivities } from '@/hooks/useCompanyActivities';
import { useInvestments } from '@/hooks/useInvestments';
import { useWallet } from '@/hooks/useWallet';
import { InvestModal } from '@/components/InvestModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sle, formatSLE } from '@/lib/currency';

interface Company {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  risk_level: 'Low' | 'Medium' | 'High';
  current_price: number;
  cpr_today: number;
  cpr_yesterday: number;
  cpr_7day_avg: number;
  cpr_30day_avg: number;
  cpr_best: number;
  cpr_worst: number;
  cpr_volatility: number;
  cpr_trend: string;
  min_investment: number;
  description?: string;
}

interface CompanyDetailProps {
  companyId: string;
  onBack: () => void;
}

export const CompanyDetail = ({ companyId, onBack }: CompanyDetailProps) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvestModal, setShowInvestModal] = useState(false);
  
  const { history: cprHistory } = useCPRHistory(companyId);
  const { activities } = useCompanyActivities(companyId);
  const { investments, createInvestment, refetch: refetchInvestments } = useInvestments();
  const { wallet, refetch: refetchWallet } = useWallet();

  useEffect(() => {
    const fetchCompany = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (!error && data) {
        setCompany({
          id: data.id,
          name: data.name,
          ticker: data.ticker,
          sector: data.sector,
          risk_level: data.risk_level as 'Low' | 'Medium' | 'High',
          current_price: Number(data.current_price),
          cpr_today: Number(data.cpr_today) || 0,
          cpr_yesterday: Number(data.cpr_yesterday) || 0,
          cpr_7day_avg: Number(data.cpr_7day_avg) || 0,
          cpr_30day_avg: Number(data.cpr_30day_avg) || 0,
          cpr_best: Number(data.cpr_best) || 0,
          cpr_worst: Number(data.cpr_worst) || 0,
          cpr_volatility: Number(data.cpr_volatility) || 0,
          cpr_trend: data.cpr_trend || 'stable',
          min_investment: Number(data.min_investment) || 50,
          description: data.description || `${data.name} is a ${data.sector.toLowerCase()} company based in Sierra Leone.`,
        });
      }
      setLoading(false);
    };
    fetchCompany();
  }, [companyId]);

  const handleInvest = async (amount: number, maturityDays: number) => {
    if (!company) return;
    const { error } = await createInvestment(company.id, amount, maturityDays);
    if (error) {
      toast.error(error);
    } else {
      toast.success(`Investment of ${sle(amount)} placed in ${company.ticker}`);
      await refetchWallet();
      await refetchInvestments();
    }
  };

  const companyInvestments = investments.filter(inv => inv.company_id === companyId);
  const totalInvested = companyInvestments.reduce((sum, inv) => sum + inv.amount, 0);

  // Generate insights based on CPR data
  const generateInsights = () => {
    if (!company) return [];
    const insights: { type: 'warning' | 'info' | 'positive'; message: string }[] = [];

    if (company.cpr_7day_avg < -20) {
      insights.push({ type: 'warning', message: 'This company has been mostly negative over the past 7 days' });
    }
    if (company.cpr_volatility > 30) {
      insights.push({ type: 'warning', message: 'High volatility detected - significant daily swings' });
    }
    if (company.cpr_best > 30) {
      insights.push({ type: 'info', message: 'Rare positive spikes observed in history' });
    }
    if (company.cpr_worst < -60) {
      insights.push({ type: 'warning', message: 'Severe negative days recorded - high risk' });
    }
    if (company.cpr_trend === 'declining') {
      insights.push({ type: 'warning', message: 'Recent trend shows declining performance' });
    }
    if (company.cpr_trend === 'improving') {
      insights.push({ type: 'positive', message: 'Recent trend shows improvement' });
    }
    if (company.risk_level === 'High') {
      insights.push({ type: 'warning', message: 'Higher risk compared to platform average' });
    }

    return insights.slice(0, 4);
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'improving': return { label: 'Improving', color: 'text-success' };
      case 'declining': return { label: 'Declining', color: 'text-destructive' };
      case 'unstable': return { label: 'Unstable', color: 'text-warning' };
      default: return { label: 'Stable', color: 'text-muted-foreground' };
    }
  };

  if (loading || !company) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="glass-card p-6 h-[200px] loading-pulse" />
      </div>
    );
  }

  const insights = generateInsights();
  const trend = getTrendLabel(company.cpr_trend);

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{company.name}</h1>
          <p className="text-sm text-muted-foreground">{company.ticker} • {company.sector}</p>
        </div>
        <span className={cn(
          "text-xs px-2 py-1 rounded-full border font-medium",
          company.risk_level === 'Low' && "risk-low",
          company.risk_level === 'Medium' && "risk-medium",
          company.risk_level === 'High' && "risk-high"
        )}>
          {company.risk_level} Risk
        </span>
      </div>

      {/* Risk Warning */}
      <RiskWarning variant="compact" />

      {/* Today's CPR Card */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Today's Performance Rate</p>
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-3xl font-bold",
                company.cpr_today >= 0 ? "text-success" : "text-destructive"
              )}>
                {company.cpr_today >= 0 ? '+' : ''}{company.cpr_today.toFixed(1)}%
              </span>
              <CPRIndicator value={company.cpr_today} size="sm" showIcon />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Yesterday</p>
            <p className={cn(
              "text-lg font-semibold",
              company.cpr_yesterday >= 0 ? "text-success" : "text-destructive"
            )}>
              {company.cpr_yesterday >= 0 ? '+' : ''}{company.cpr_yesterday.toFixed(1)}%
            </p>
          </div>
        </div>
        
        {/* CPR History Chart */}
        {cprHistory.length > 0 && (
          <CPRChart data={cprHistory} height={140} showAxis />
        )}
      </div>

      {/* CPR Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3">
          <p className="text-xs text-muted-foreground">7-Day Average</p>
          <p className={cn(
            "text-lg font-bold",
            company.cpr_7day_avg >= 0 ? "text-success" : "text-destructive"
          )}>
            {company.cpr_7day_avg >= 0 ? '+' : ''}{company.cpr_7day_avg.toFixed(1)}%
          </p>
        </div>
        <div className="glass-card p-3">
          <p className="text-xs text-muted-foreground">30-Day Average</p>
          <p className={cn(
            "text-lg font-bold",
            company.cpr_30day_avg >= 0 ? "text-success" : "text-destructive"
          )}>
            {company.cpr_30day_avg >= 0 ? '+' : ''}{company.cpr_30day_avg.toFixed(1)}%
          </p>
        </div>
        <div className="glass-card p-3">
          <p className="text-xs text-muted-foreground">Best Day</p>
          <p className="text-lg font-bold text-success">+{company.cpr_best.toFixed(1)}%</p>
        </div>
        <div className="glass-card p-3">
          <p className="text-xs text-muted-foreground">Worst Day</p>
          <p className="text-lg font-bold text-destructive">{company.cpr_worst.toFixed(1)}%</p>
        </div>
      </div>

      {/* Volatility & Trend */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Volatility</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    company.cpr_volatility > 50 ? "bg-destructive" :
                    company.cpr_volatility > 25 ? "bg-warning" : "bg-success"
                  )}
                  style={{ width: `${Math.min(100, company.cpr_volatility)}%` }}
                />
              </div>
              <span className="text-sm font-medium">{company.cpr_volatility.toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Trend</p>
            </div>
            <p className={cn("text-lg font-semibold", trend.color)}>{trend.label}</p>
          </div>
        </div>
      </div>

      {/* Insights & Recommendations */}
      {insights.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Insights & Analysis</h3>
          </div>
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <div 
                key={idx}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-lg text-sm",
                  insight.type === 'warning' && "bg-warning/10 text-warning",
                  insight.type === 'info' && "bg-primary/10 text-primary",
                  insight.type === 'positive' && "bg-success/10 text-success"
                )}
              >
                {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {insight.type === 'info' && <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {insight.type === 'positive' && <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{insight.message}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            These insights are informational only and do not guarantee outcomes.
          </p>
        </div>
      )}

      {/* Invest Button */}
      <button
        onClick={() => setShowInvestModal(true)}
        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all"
      >
        Invest in {company.ticker}
      </button>

      {/* My Investments */}
      {companyInvestments.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-3">Your Investments</h3>
          <div className="space-y-2">
            {companyInvestments.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div>
                  <p className="font-medium">{sle(inv.amount)}</p>
                  <p className="text-xs text-muted-foreground">{inv.maturity_days} days</p>
                </div>
                <div className="text-right">
                  <p className={cn("font-bold", inv.profit_loss >= 0 ? "text-success" : "text-destructive")}>
                    {formatSLE(inv.profit_loss, true)}
                  </p>
                  <p className="text-xs text-muted-foreground">Est. value</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities */}
      {activities.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Company Updates</h3>
          </div>
          <div className="space-y-2">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(activity.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invest Modal */}
      {showInvestModal && wallet && (
        <InvestModal
          isOpen={showInvestModal}
          onClose={() => setShowInvestModal(false)}
          company={{
            id: company.id,
            name: company.name,
            ticker: company.ticker,
            minInvestment: company.min_investment,
            riskLevel: company.risk_level,
            cprToday: company.cpr_today,
          }}
          balance={wallet.balance}
          onInvest={handleInvest}
        />
      )}
    </div>
  );
};
