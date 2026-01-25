import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface CPIChartProps {
  data: Array<{ recorded_at: string; cpi_score: number }>;
  height?: number;
  showAxis?: boolean;
}

export const CPIChart = ({ 
  data, 
  height = 120, 
  showAxis = false 
}: CPIChartProps) => {
  const chartData = useMemo(() => {
    return data.map(d => ({
      time: new Date(d.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: d.cpi_score,
    }));
  }, [data]);

  const isPositive = useMemo(() => {
    if (chartData.length < 2) return true;
    return chartData[chartData.length - 1].value >= chartData[0].value;
  }, [chartData]);

  const gradientId = useMemo(() => `cpi-gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  if (chartData.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        No CPI history yet
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop 
                offset="0%" 
                stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
                stopOpacity={0.4} 
              />
              <stop 
                offset="100%" 
                stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
                stopOpacity={0} 
              />
            </linearGradient>
          </defs>
          {showAxis && (
            <>
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                width={30}
                domain={[0, 100]}
              />
            </>
          )}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => [`CPI: ${value.toFixed(1)}`, '']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
