import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { CompanyCard } from '@/components/CompanyCard';
import { CompanyDetail } from '@/components/CompanyDetail';
import { InvestModal } from '@/components/InvestModal';
import { useCompanies } from '@/hooks/useCompanies';
import { useWallet } from '@/hooks/useWallet';
import { useInvestments } from '@/hooks/useInvestments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SECTORS = ['All', 'Mining', 'Agriculture', 'Technology', 'Finance', 'Energy', 'Real Estate', 'Telecom', 'Tourism', 'Transport'];

export const InvestTab = () => {
  const { companies, loading } = useCompanies();
  const { wallet, refetch: refetchWallet } = useWallet();
  const { createInvestment, refetch: refetchInvestments } = useInvestments();
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState<typeof companies[0] | null>(null);
  const [viewingCompanyId, setViewingCompanyId] = useState<string | null>(null);

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ticker.toLowerCase().includes(search.toLowerCase()) ||
      c.sector.toLowerCase().includes(search.toLowerCase());
    const matchesSector = selectedSector === 'All' || c.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const handleInvest = async (amount: number, maturityDays: number) => {
    if (!selectedCompany) return;
    
    const { error } = await createInvestment(selectedCompany.id, amount, maturityDays);
    
    if (error) {
      toast.error(error);
    } else {
      toast.success(`Successfully invested ${amount} SLE in ${selectedCompany.ticker} for ${maturityDays} days`);
      await refetchWallet();
      await refetchInvestments();
    }
  };

  // Show company detail view
  if (viewingCompanyId) {
    return (
      <CompanyDetail 
        companyId={viewingCompanyId} 
        onBack={() => setViewingCompanyId(null)} 
      />
    );
  }

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
          Long-term company investments (30-90 days). Balance: ${wallet?.balance.toFixed(2) || '0.00'}
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

      {/* Sector Filter */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by sector</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {SECTORS.map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                selectedSector === sector
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {sector}
            </button>
          ))}
        </div>
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

      {/* Companies Count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredCompanies.length} companies
      </p>

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
            onView={() => setViewingCompanyId(company.id)}
          />
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No companies found matching your criteria</p>
        </div>
      )}

      {/* Invest Modal */}
      {selectedCompany && wallet && (
        <InvestModal
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
          company={{
            id: selectedCompany.id,
            name: selectedCompany.name,
            ticker: selectedCompany.ticker,
            minInvestment: Number(selectedCompany.min_investment) || 50,
            guaranteedReturnPercent: Number(selectedCompany.guaranteed_return_percent) || 25,
          }}
          balance={wallet.balance}
          onInvest={handleInvest}
        />
      )}
    </div>
  );
};
