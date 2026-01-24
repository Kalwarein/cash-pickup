import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, Users, Clock, Calendar, Building2 } from 'lucide-react';
import { MarketChart } from '@/components/MarketChart';
import { useCompanyPriceHistory } from '@/hooks/useCompanyPriceHistory';
import { useInvestments } from '@/hooks/useInvestments';
import { useWallet } from '@/hooks/useWallet';
import { InvestModal } from '@/components/InvestModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  risk_level: 'Low' | 'Medium' | 'High';
  current_price: number;
  price_change_percent: number;
  min_return_percent: number;
  max_return_percent: number;
  description?: string;
  image_url?: string;
  founded_year?: number;
  headquarters?: string;
  employees?: number;
}

interface CompanyDetailProps {
  companyId: string;
  onBack: () => void;
}

export const CompanyDetail = ({ companyId, onBack }: CompanyDetailProps) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvestModal, setShowInvestModal] = useState(false);
  
  const { chartData, currentPrice } = useCompanyPriceHistory(companyId);
  const { investments, createInvestment, refetch: refetchInvestments } = useInvestments();
  const { wallet, refetch: refetchWallet } = useWallet();

  // Fetch company details
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
          price_change_percent: Number(data.price_change_percent),
          min_return_percent: Number(data.min_return_percent),
          max_return_percent: Number(data.max_return_percent),
          description: data.description || `${data.name} is a leading ${data.sector.toLowerCase()} company based in Sierra Leone.`,
          image_url: data.image_url,
          founded_year: data.founded_year || 2015,
          headquarters: data.headquarters || 'Freetown, Sierra Leone',
          employees: data.employees || Math.floor(Math.random() * 5000) + 100,
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
      toast.success(`Successfully invested $${amount} in ${company.ticker}`);
      await refetchWallet();
      await refetchInvestments();
    }
  };

  // Get user's investments in this company
  const companyInvestments = investments.filter(inv => inv.company_id === companyId);
  const totalInvested = companyInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalProfitLoss = companyInvestments.reduce((sum, inv) => sum + inv.profit_loss, 0);

  if (loading || !company) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="glass-card p-6 h-[300px] loading-pulse" />
        <div className="glass-card p-4 h-[200px] loading-pulse" />
      </div>
    );
  }

  const isPositive = company.price_change_percent >= 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
        >
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

      {/* Price Chart */}
      <div className="glass-card p-4 glow-primary">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Price</p>
            <p className="text-3xl font-bold">${(currentPrice || company.current_price).toFixed(2)}</p>
            <div className={cn(
              "flex items-center gap-2 mt-1",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-semibold">{isPositive ? '+' : ''}{company.price_change_percent.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <MarketChart data={chartData} height={200} showAxis />
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        )}
      </div>

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
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground">Total Invested</p>
              <p className="font-bold">${totalInvested.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground">Total P/L</p>
              <p className={cn(
                "font-bold",
                totalProfitLoss >= 0 ? "text-success" : "text-destructive"
              )}>
                {totalProfitLoss >= 0 ? '+' : ''}${totalProfitLoss.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {companyInvestments.map((inv) => {
              const daysRemaining = Math.max(0, Math.ceil(
                (new Date(inv.maturity_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              ));
              
              return (
                <div key={inv.id} className="p-3 bg-muted/30 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-medium">${inv.amount.toFixed(2)}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {inv.is_matured ? 'Matured' : `${daysRemaining}d remaining`}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${inv.current_value.toFixed(2)}</p>
                    <p className={cn(
                      "text-xs",
                      inv.profit_loss >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {inv.profit_loss >= 0 ? '+' : ''}${inv.profit_loss.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Company Info */}
      <div className="glass-card p-4">
        <h3 className="font-semibold mb-3">About {company.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{company.description}</p>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{company.headquarters}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Founded {company.founded_year}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{company.employees?.toLocaleString()} employees</span>
          </div>
        </div>
      </div>

      {/* Risk Info */}
      <div className="glass-card p-4 flex items-start gap-3 bg-warning/5 border-warning/20">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-warning">Investment Risk</p>
          <p className="text-xs text-muted-foreground mt-1">
            Expected returns: {company.min_return_percent}% to +{company.max_return_percent}%. 
            Longer investment periods (30-90 days) generally provide better returns and lower risk.
          </p>
        </div>
      </div>

      {/* Invest Modal */}
      {showInvestModal && wallet && (
        <InvestModal
          isOpen={showInvestModal}
          onClose={() => setShowInvestModal(false)}
          company={{
            id: company.id,
            name: company.name,
            ticker: company.ticker,
            price: currentPrice || company.current_price,
            riskLevel: company.risk_level,
            minReturn: company.min_return_percent,
            maxReturn: company.max_return_percent,
          }}
          balance={wallet.balance}
          onInvest={handleInvest}
        />
      )}
    </div>
  );
};
