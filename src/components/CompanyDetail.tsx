import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Shield, Clock, Building2, MessageSquare, Award } from 'lucide-react';
import { CPIGauge } from '@/components/CPIGauge';
import { CPIChart } from '@/components/CPIChart';
import { useCPIHistory } from '@/hooks/useCPI';
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
  cpi_score: number;
  min_investment: number;
  guaranteed_return_percent: number;
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
  
  const { history: cpiHistory } = useCPIHistory(companyId);
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
          cpi_score: Number(data.cpi_score) || 50,
          min_investment: Number(data.min_investment) || 50,
          guaranteed_return_percent: Number(data.guaranteed_return_percent) || 25,
          description: data.description || `${data.name} is a leading ${data.sector.toLowerCase()} company based in Sierra Leone.`,
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
      toast.success(`Successfully invested ${sle(amount)} in ${company.ticker}`);
      await refetchWallet();
      await refetchInvestments();
    }
  };

  const companyInvestments = investments.filter(inv => inv.company_id === companyId);
  const totalInvested = companyInvestments.reduce((sum, inv) => sum + inv.amount, 0);

  if (loading || !company) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="glass-card p-6 h-[200px] loading-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{company.name}</h1>
          <p className="text-sm text-muted-foreground">{company.ticker} • {company.sector}</p>
        </div>
      </div>

      {/* CPI Card */}
      <div className="glass-card p-4 glow-primary">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Company Performance Index</p>
            <p className="text-3xl font-bold">{company.cpi_score.toFixed(0)} <span className="text-lg text-muted-foreground">/ 100</span></p>
          </div>
          <CPIGauge score={company.cpi_score} size="lg" />
        </div>
        
        {cpiHistory.length > 0 && (
          <CPIChart data={cpiHistory} height={120} showAxis />
        )}
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
          <Award className="w-4 h-4" />
          <span>CPI reflects investment activity and company performance</span>
        </div>
      </div>

      {/* Guaranteed Return */}
      <div className="glass-card p-4 flex items-start gap-3 bg-success/10 border-success/20">
        <Shield className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-success">Guaranteed {company.guaranteed_return_percent}% Return</p>
          <p className="text-xs text-muted-foreground mt-1">
            Minimum investment: {sle(company.min_investment)}
          </p>
        </div>
      </div>

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
            guaranteedReturnPercent: company.guaranteed_return_percent,
          }}
          balance={wallet.balance}
          onInvest={handleInvest}
        />
      )}
    </div>
  );
};
