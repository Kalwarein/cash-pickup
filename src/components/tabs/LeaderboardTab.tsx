import { useState } from 'react';
import { Trophy, TrendingUp, Medal, Users, Building2, RefreshCw } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

type TabType = 'profit' | 'volume' | 'companies';

export const LeaderboardTab = () => {
  const { topByProfit, topByVolume, topCompanies, loading, refreshLeaderboard } = useLeaderboard();
  const [activeTab, setActiveTab] = useState<TabType>('profit');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshLeaderboard();
    setRefreshing(false);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground text-sm">Top investors & companies</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
        >
          <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-muted p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('profit')}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === 'profit' 
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Top Profit
        </button>
        <button
          onClick={() => setActiveTab('volume')}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === 'volume' 
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="w-4 h-4" />
          Most Active
        </button>
        <button
          onClick={() => setActiveTab('companies')}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === 'companies' 
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="w-4 h-4" />
          Companies
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-4 h-20 loading-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Top by Profit */}
          {activeTab === 'profit' && (
            <div className="space-y-3">
              {topByProfit.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No investors yet. Be the first!</p>
                </div>
              ) : (
                topByProfit.map((entry, index) => (
                  <div key={entry.id} className={cn(
                    "glass-card p-4 flex items-center gap-4",
                    index < 3 && "glow-primary"
                  )}>
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      {getRankBadge(entry.rank_by_profit)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{entry.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.total_investments} investments • {entry.win_rate.toFixed(0)}% win rate
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-bold",
                        entry.total_profit >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {entry.total_profit >= 0 ? '+' : ''}${entry.total_profit.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Profit</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Top by Volume */}
          {activeTab === 'volume' && (
            <div className="space-y-3">
              {topByVolume.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No trading activity yet.</p>
                </div>
              ) : (
                topByVolume.map((entry, index) => (
                  <div key={entry.id} className={cn(
                    "glass-card p-4 flex items-center gap-4",
                    index < 3 && "glow-accent"
                  )}>
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      {getRankBadge(entry.rank_by_volume)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{entry.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.total_trades} trades
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {entry.total_investments + entry.total_trades}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Activity</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Top Companies */}
          {activeTab === 'companies' && (
            <div className="space-y-3">
              {topCompanies.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No company data yet.</p>
                </div>
              ) : (
                topCompanies.map((company, index) => (
                  <div key={company.company_id} className={cn(
                    "glass-card p-4 flex items-center gap-4",
                    index < 3 && "glow-success"
                  )}>
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-foreground">
                        {company.company_ticker.slice(0, 3)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{company.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.investor_count} investors
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${company.total_invested.toFixed(0)}</p>
                      <p className={cn(
                        "text-xs",
                        company.avg_return >= 0 ? "text-success" : "text-destructive"
                      )}>
                        Avg: {company.avg_return >= 0 ? '+' : ''}{company.avg_return.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
