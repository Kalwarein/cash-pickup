import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap, Clock } from 'lucide-react';
import { MarketChart } from '@/components/MarketChart';
import { useMarketSimulation } from '@/hooks/useMarketSimulation';
import { cn } from '@/lib/utils';

const MARKET_EVENTS = [
  { message: 'Sell pressure detected', type: 'warning' },
  { message: 'High volatility alert', type: 'danger' },
  { message: 'Bullish trend forming', type: 'success' },
  { message: 'Support level tested', type: 'info' },
  { message: 'Resistance breakout', type: 'success' },
  { message: 'Volume spike detected', type: 'warning' },
  { message: 'Market consolidating', type: 'info' },
  { message: 'Momentum building', type: 'success' },
];

export const MarketTab = () => {
  const { chartData, marketStatus } = useMarketSimulation();
  const [events, setEvents] = useState<Array<{ id: string; message: string; type: string; time: Date }>>([]);

  useEffect(() => {
    // Initialize with some events
    const initial = MARKET_EVENTS.slice(0, 3).map((e, i) => ({
      id: `init-${i}`,
      ...e,
      time: new Date(Date.now() - (3 - i) * 60000),
    }));
    setEvents(initial);

    // Add new events periodically
    const interval = setInterval(() => {
      const randomEvent = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
      setEvents(prev => [
        ...prev.slice(-4),
        { id: `evt-${Date.now()}`, ...randomEvent, time: new Date() },
      ]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const currentValue = chartData[chartData.length - 1]?.value || 0;
  const previousValue = chartData[0]?.value || 0;
  const changePercent = previousValue ? ((currentValue - previousValue) / previousValue) * 100 : 0;
  const isPositive = changePercent >= 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Market</h1>
          <p className="text-muted-foreground text-sm">24/7 Live Simulation</p>
        </div>
        <div className="flex items-center gap-2 text-success">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium">LIVE</span>
        </div>
      </div>

      {/* Main Chart */}
      <div className="glass-card p-6 glow-primary">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Global Market Index</p>
            <p className="text-4xl font-bold mb-2">${currentValue.toFixed(2)}</p>
            <div className={cn(
              "flex items-center gap-2",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span className="font-semibold">{isPositive ? '+' : ''}{changePercent.toFixed(2)}%</span>
              <span className="text-muted-foreground text-sm">Today</span>
            </div>
          </div>
          <div className={cn(
            "px-4 py-2 rounded-xl",
            marketStatus.status === 'rising' && "bg-success/10 text-success",
            marketStatus.status === 'falling' && "bg-destructive/10 text-destructive",
            marketStatus.status === 'volatile' && "bg-warning/10 text-warning"
          )}>
            <p className="text-sm font-medium">{marketStatus.message}</p>
          </div>
        </div>

        <MarketChart data={chartData} height={280} showAxis />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 text-center">
          <Activity className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="font-bold">847K</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Zap className="w-6 h-6 mx-auto mb-2 text-warning" />
          <p className="text-xs text-muted-foreground">Volatility</p>
          <p className="font-bold">
            {marketStatus.status === 'volatile' ? 'High' : 'Normal'}
          </p>
        </div>
        <div className="glass-card p-4 text-center">
          <Clock className="w-6 h-6 mx-auto mb-2 text-accent" />
          <p className="text-xs text-muted-foreground">Session</p>
          <p className="font-bold">Active</p>
        </div>
      </div>

      {/* Market Events */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Market Events</h2>
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className={cn(
                "glass-card p-3 flex items-center justify-between animate-fade-in",
                event.type === 'success' && "border-l-2 border-success",
                event.type === 'warning' && "border-l-2 border-warning",
                event.type === 'danger' && "border-l-2 border-destructive",
                event.type === 'info' && "border-l-2 border-primary"
              )}
            >
              <p className="text-sm font-medium">{event.message}</p>
              <p className="text-xs text-muted-foreground">
                {event.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
