import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Shield, Users, Clock, Calendar, Building2, MessageSquare } from 'lucide-react';
import { CandlestickChart } from '@/components/CandlestickChart';
import { useCompanyCandles } from '@/hooks/useCompanyCandles';
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
  price_change_percent: number;
  min_return_percent: number;
  max_return_percent: number;
  min_investment: number;
  guaranteed_return_percent: number;
  description?: string;
  image_url?: string;
  banner_url?: string;
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
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  
  // Use the new candlestick hook for OHLC data
  const { chartData, currentPrice, loading: chartLoading } = useCompanyCandles(companyId);
  const { activities, loading: activitiesLoading } = useCompanyActivities(companyId);
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
          min_investment: Number(data.min_investment) || 50,
          guaranteed_return_percent: Number(data.guaranteed_return_percent) || 25,
          description: data.description || `${data.name} is a leading ${data.sector.toLowerCase()} company based in Sierra Leone with guaranteed investment returns.`,
          image_url: data.image_url,
          banner_url: data.banner_url,
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
      toast.success(`Successfully invested ${sle(amount)} in ${company.ticker}`);
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

  const displayPrice = currentPrice || company.current_price;
  const isPositive = company.price_change_percent >= 0;

  return (
    <div className={cn("space-y-4 animate-fade-in", isChartFullscreen && "fixed inset-0 z-50 bg-background p-4 overflow-auto")}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={isChartFullscreen ? () => setIsChartFullscreen(false) : onBack}
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

      {/* Price + Candlestick Chart */}
      <div className="glass-card p-4 glow-primary">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Price</p>
            <p className="text-3xl font-bold">{sle(displayPrice)}</p>
            <div className={cn(
              "flex items-center gap-2 mt-1",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-semibold">{isPositive ? '+' : ''}{company.price_change_percent.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {chartLoading ? (
          <div className="h-[250px] loading-pulse rounded-lg" />
        ) : chartData.length > 0 ? (
          <CandlestickChart 
            data={chartData} 
            height={isChartFullscreen ? 400 : 250}
            isFullscreen={isChartFullscreen}
            onToggleFullscreen={() => setIsChartFullscreen(!isChartFullscreen)}
          />
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Building price history...
          </div>
        )}
      </div>

      {/* Invest Button */}
      {!isChartFullscreen && (
        <>
          {/* Guaranteed Return Banner */}
          <div className="glass-card p-4 flex items-start gap-3 bg-success/10 border-success/20">
            <Shield className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-success">Guaranteed {company.guaranteed_return_percent}% Return</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your investment is guaranteed. Minimum investment: {sle(company.min_investment)}
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
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Total Invested</p>
                  <p className="font-bold">{sle(totalInvested)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Expected Profit</p>
                  <p className={cn(
                    "font-bold",
                    totalProfitLoss >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatSLE(totalProfitLoss, true)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {companyInvestments.map((inv) => {
                  const daysRemaining = Math.max(0, Math.ceil(
                    (new Date(inv.maturity_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  ));
                  const progress = Math.min(100, ((inv.maturity_days - daysRemaining) / inv.maturity_days) * 100);
                  
                  return (
                    <div key={inv.id} className="p-3 bg-muted/30 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{sle(inv.amount)}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {inv.is_matured ? 'Matured' : `${daysRemaining}d remaining`}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-success">{sle(inv.current_value)}</p>
                          <p className="text-xs text-success">
                            +{formatSLE(inv.profit_loss, false)}
                          </p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            inv.is_matured ? "bg-success" : "bg-primary"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Company Activity Feed */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Company Updates</h3>
            </div>
            {activitiesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 loading-pulse rounded-lg" />
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {activities.map((activity) => (
                  <div key={activity.id} className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No updates yet. Check back soon!
              </p>
            )}
          </div>

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
        </>
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
            price: displayPrice,
            riskLevel: company.risk_level,
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
