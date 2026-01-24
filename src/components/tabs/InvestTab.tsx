import { useState } from 'react';
import { Search } from 'lucide-react';
import { CompanyCard } from '@/components/CompanyCard';
import { InvestModal } from '@/components/InvestModal';
import { useCompanies } from '@/hooks/useCompanies';
import { useWallet } from '@/hooks/useWallet';
import { useInvestments } from '@/hooks/useInvestments';
import { toast } from 'sonner';

export const InvestTab = () => {
  const { companies, loading } = useCompanies();
  const { wallet, refetch: refetchWallet } = useWallet();
  const { createInvestment, refetch: refetchInvestments } = useInvestments();
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<typeof companies[0] | null>(null);

  const filteredCompanies = companies.filter(
    c => c.name.toLowerCase().includes(search.toLowerCase()) ||
         c.ticker.toLowerCase().includes(search.toLowerCase()) ||
         c.sector.toLowerCase().includes(search.toLowerCase())
  );

  const handleInvest = async (amount: number) => {
    if (!selectedCompany) return;
    
    const { error } = await createInvestment(selectedCompany.id, amount);
    
    if (error) {
      toast.error(error);
    } else {
      toast.success(`Successfully invested $${amount} in ${selectedCompany.ticker}`);
      await refetchWallet();
      await refetchInvestments();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass-card p-4 h-32 loading-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">Invest</h1>
        <p className="text-muted-foreground text-sm">
          Choose a company to invest in. Balance: ${wallet?.balance.toFixed(2) || '0.00'}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="w-full bg-input border border-border rounded-xl pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Risk Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success" />
          Low Risk
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning" />
          Medium Risk
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-destructive" />
          High Risk
        </span>
      </div>

      {/* Companies List */}
      <div className="space-y-3">
        {filteredCompanies.map((company) => (
          <CompanyCard
            key={company.id}
            name={company.name}
            ticker={company.ticker}
            sector={company.sector}
            price={company.current_price}
            change={company.price_change_percent}
            riskLevel={company.risk_level}
            isTrending={company.is_trending}
            onInvest={() => setSelectedCompany(company)}
          />
        ))}
      </div>

      {/* Invest Modal */}
      {selectedCompany && wallet && (
        <InvestModal
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
          company={{
            id: selectedCompany.id,
            name: selectedCompany.name,
            ticker: selectedCompany.ticker,
            price: selectedCompany.current_price,
            riskLevel: selectedCompany.risk_level,
            minReturn: selectedCompany.min_return_percent,
            maxReturn: selectedCompany.max_return_percent,
          }}
          balance={wallet.balance}
          onInvest={handleInvest}
        />
      )}
    </div>
  );
};
