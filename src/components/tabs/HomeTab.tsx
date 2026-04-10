import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Activity, 
  Flame, 
  Ticket, 
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Clock,
  ChevronRight,
  BarChart3,
  Target,
  Shield,
  Zap,
  Globe,
  Bell,
  Calendar,
  MoreHorizontal,
  DollarSign,
  Percent,
  Briefcase,
  Gem,
  Crown
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { useCPR } from '@/hooks/useCPR';
import { useCompanies } from '@/hooks/useCompanies';
import { useInvestments } from '@/hooks/useInvestments';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CPRIndicator } from '@/components/CPRIndicator';
import { InvestmentProgressBar } from '@/components/InvestmentProgressBar';
import { RiskWarning } from '@/components/RiskWarning';
import { PromoCodeMarketplace } from '@/components/PromoCodeMarketplace';
import { cn } from '@/lib/utils';
import { formatSLE, sle } from '@/lib/currency';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell 
} from 'recharts';

export const HomeTab = () => {
  const { topPerformers, averageCPR, loading: cprLoading } = useCPR();
  const { companies } = useCompanies();
  const { investments, completedInvestments } = useInvestments();
  const [showPromoMarketplace, setShowPromoMarketplace] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [sparklePosition, setSparklePosition] = useState({ x: 0, y: 0 });

  const trendingCompanies = companies.filter(c => c.is_trending).slice(0, 4);
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalProfitLoss = investments.reduce((sum, inv) => sum + inv.profit_loss, 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);
  
  // Calculate net profit from completed investments
  const completedProfit = completedInvestments
    .reduce((sum, inv) => sum + (inv.final_profit_loss || 0), 0);

  // Portfolio allocation data for pie chart
  const portfolioData = investments.slice(0, 5).map(inv => ({
    name: inv.company_ticker || 'Unknown',
    value: inv.current_value,
    percentage: (inv.current_value / totalCurrentValue) * 100
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Mock chart data for mini sparkline
  const sparklineData = [
    { time: '9:30', value: 2.4 },
    { time: '10:30', value: 2.8 },
    { time: '11:30', value: 3.2 },
    { time: '12:30', value: 2.9 },
    { time: '13:30', value: 3.5 },
    { time: '14:30', value: averageCPR }
  ];

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Determine market status based on average CPR
  const getMarketStatus = () => {
    if (averageCPR >= 5) return { 
      status: 'positive', 
      message: 'Bull Market', 
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      icon: TrendingUp,
      description: 'Strong momentum'
    };
    if (averageCPR >= -10) return { 
      status: 'stable', 
      message: 'Neutral Market', 
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      icon: Activity,
      description: 'Moderate activity'
    };
    return { 
      status: 'negative', 
      message: 'Bear Market', 
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      icon: TrendingDown,
      description: 'High volatility'
    };
  };

  const marketStatus = getMarketStatus();
  const StatusIcon = marketStatus.icon;

  // Calculate portfolio health score
  const portfolioHealth = totalInvested > 0 
    ? Math.min(100, Math.max(0, 50 + (totalProfitLoss / totalInvested) * 100))
    : 0;

  return (
    <div className="space-y-5 pb-8 animate-fade-in">
      {/* Premium Header with Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-6 border border-primary/10">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{greeting} 👋</p>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Cash Pickup
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="relative p-3 bg-background/50 backdrop-blur-sm rounded-2xl border border-border hover:bg-background/70 transition-all hover:scale-105">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              </button>
              
              <button
                onClick={() => setShowPromoMarketplace(true)}
                className="p-3 bg-gradient-to-br from-primary to-accent rounded-2xl text-primary-foreground hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-105"
                title="Promo Codes"
              >
                <Ticket className="w-5 h-5" />
              </button>
              
              <ThemeToggle />
            </div>
          </div>

          {/* Market Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm bg-background/50 mb-4">
            <StatusIcon className={cn("w-4 h-4", marketStatus.color.split(' ')[0])} />
            <span className="text-sm font-medium">{marketStatus.message}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{marketStatus.description}</span>
          </div>

          {/* CPR Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Platform CPR Index</p>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-5xl font-bold",
                      averageCPR >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {averageCPR >= 0 ? '+' : ''}{averageCPR.toFixed(2)}%
                    </span>
                    <CPRIndicator value={averageCPR} size="xl" showLabel />
                  </div>
                </div>
                
                {/* Mini Sparkline */}
                <div className="flex-1 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                      <defs>
                        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={averageCPR >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={averageCPR >= 0 ? '#10B981' : '#EF4444'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={averageCPR >= 0 ? '#10B981' : '#EF4444'} 
                        strokeWidth={2}
                        fill="url(#sparklineGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-background/50 backdrop-blur-sm border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Portfolio</span>
                </div>
                <p className="text-xl font-bold">{sle(totalCurrentValue)}</p>
                <p className={cn(
                  "text-xs font-medium mt-1",
                  totalProfitLoss >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {totalProfitLoss >= 0 ? '▲' : '▼'} {sle(Math.abs(totalProfitLoss))}
                </p>
              </div>
              
              <div className="p-3 rounded-2xl bg-background/50 backdrop-blur-sm border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-purple-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Health Score</span>
                </div>
                <p className="text-xl font-bold">{portfolioHealth.toFixed(0)}%</p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${portfolioHealth}%` }}
                    className={cn(
                      "h-full rounded-full",
                      portfolioHealth >= 70 ? "bg-emerald-500" : 
                      portfolioHealth >= 40 ? "bg-amber-500" : "bg-rose-500"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Warning - Premium Style */}
      <RiskWarning variant="inline" />

      {/* Quick Actions Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { icon: TrendingUp, label: 'Invest', color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: ArrowDownRight, label: 'Withdraw', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: BarChart3, label: 'Analytics', color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { icon: Shield, label: 'Security', color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: Globe, label: 'Markets', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
        ].map((action, idx) => (
          <button
            key={idx}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border hover:bg-accent/10 transition-all hover:scale-105 whitespace-nowrap"
          >
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", action.bg)}>
              <action.icon className={cn("w-4 h-4", action.color)} />
            </div>
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Investments */}
        <div className="lg:col-span-2 space-y-5">
          {/* Active Investments with Premium Design */}
          {investments.length > 0 && (
            <div className="rounded-3xl bg-card border border-border overflow-hidden">
              <div className="p-5 border-b border-border bg-gradient-to-r from-transparent via-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Active Positions</h2>
                      <p className="text-xs text-muted-foreground">{investments.length} investments</p>
                    </div>
                  </div>
                  <button className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                {/* Portfolio Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Invested</p>
                    <p className="text-base font-bold">{sle(totalInvested)}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Current</p>
                    <p className={cn(
                      "text-base font-bold",
                      totalCurrentValue >= totalInvested ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {sle(totalCurrentValue)}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">P/L</p>
                    <p className={cn(
                      "text-base font-bold",
                      totalProfitLoss >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {totalProfitLoss >= 0 ? '+' : ''}{((totalProfitLoss / totalInvested) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Investment Cards with Enhanced Design */}
                <AnimatePresence>
                  {investments.slice(0, 4).map((inv, index) => {
                    const profitPercent = inv.amount > 0 ? (inv.profit_loss / inv.amount) * 100 : 0;
                    
                    return (
                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group p-5 rounded-2xl bg-muted/20 border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
                                <span className="text-sm font-bold">
                                  {inv.company_ticker?.slice(0, 2)}
                                </span>
                              </div>
                              {profitPercent >= 0 ? (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <TrendingUp className="w-3 h-3 text-white" />
                                </div>
                              ) : (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                                  <TrendingDown className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{inv.company_name}</p>
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                  {inv.company_ticker}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{inv.maturity_days} days left</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <DollarSign className="w-3 h-3" />
                                  <span>{sle(inv.amount)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{sle(inv.current_value)}</p>
                            <p className={cn(
                              "text-sm font-semibold",
                              inv.profit_loss >= 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {inv.profit_loss >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                        
                        {/* Enhanced Progress Bar */}
                        <InvestmentProgressBar
                          maturityDate={inv.maturity_date}
                          maturityDays={inv.maturity_days}
                          createdAt={inv.created_at}
                          companyName={inv.company_name || ''}
                          amount={inv.amount}
                        />
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                            Add Funds
                          </button>
                          <button className="flex-1 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/70 transition-colors">
                            Details
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Completed Investments with Premium Style */}
          {completedInvestments.length > 0 && (
            <div className="rounded-3xl bg-card border border-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Completed Trades</h2>
                      <p className="text-xs text-muted-foreground">Recent settlements</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-semibold",
                    completedProfit >= 0 
                      ? "bg-emerald-500/10 text-emerald-500" 
                      : "bg-rose-500/10 text-rose-500"
                  )}>
                    Net: {completedProfit >= 0 ? '+' : ''}{sle(completedProfit)}
                  </div>
                </div>
              </div>
              
              <div className="p-5 space-y-2">
                {completedInvestments.slice(0, 3).map((inv, index) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group flex items-center justify-between p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-all border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        (inv.final_profit_loss || 0) >= 0 
                          ? "bg-emerald-500/10" 
                          : "bg-rose-500/10"
                      )}>
                        {(inv.final_profit_loss || 0) >= 0 ? (
                          <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-rose-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{inv.company_name}</p>
                        <p className="text-xs text-muted-foreground">Completed {new Date(inv.maturity_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        (inv.final_profit_loss || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {(inv.final_profit_loss || 0) >= 0 ? '+' : ''}{sle(inv.final_profit_loss || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((inv.final_profit_loss || 0) / inv.amount * 100).toFixed(2)}% return
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Stats & Top Performers */}
        <div className="space-y-5">
          {/* Portfolio Allocation Pie Chart */}
          {investments.length > 0 && (
            <div className="rounded-3xl bg-card border border-border p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" />
                Portfolio Allocation
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {portfolioData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {portfolioData.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[idx] }}
                    />
                    <span className="text-xs">{item.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Users"
              value="2,847"
              icon={<Users className="w-4 h-4" />}
              trend="+12%"
              trendUp={true}
            />
            <StatCard
              label="Active Investments"
              value={investments.length.toString()}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <StatCard
              label="Your Portfolio"
              value={`${totalInvested.toFixed(0)} SLE`}
              change={totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0}
            />
            <StatCard
              label="Market Activity"
              value="High"
              icon={<Activity className="w-4 h-4" />}
            />
          </div>

          {/* Top Performers with Premium Design */}
          <div className="rounded-3xl bg-card border border-border overflow-hidden">
            <div className="p-5 border-b border-border bg-gradient-to-r from-transparent via-amber-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Top Performers</h2>
                  <p className="text-xs text-muted-foreground">Highest CPR today</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              {topPerformers.slice(0, 4).map((company, index) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex items-center justify-between p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-all border border-transparent hover:border-border cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
                        <span className="text-sm font-bold">
                          {company.ticker.slice(0, 2)}
                        </span>
                      </div>
                      {index === 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{company.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{company.sector}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{company.ticker}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CPRIndicator value={company.cpr_today} size="md" />
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl bg-primary/10 text-primary">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Market Insights Card */}
          <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Market Insight</h3>
                <p className="text-sm text-muted-foreground">
                  {averageCPR >= 5 
                    ? "Strong momentum detected. Consider increasing exposure to high CPR assets."
                    : averageCPR >= -10
                    ? "Market showing mixed signals. Diversification recommended."
                    : "High volatility period. Consider defensive positions."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Promo Code Marketplace Modal */}
      <PromoCodeMarketplace 
        isOpen={showPromoMarketplace} 
        onClose={() => setShowPromoMarketplace(false)} 
      />
    </div>
  );
};
