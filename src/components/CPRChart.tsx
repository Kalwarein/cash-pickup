import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';

interface CPRChartProps {
  data: Array<{ recorded_date: string; cpr_value: number }>;
  height?: number;
  showAxis?: boolean;
}

export const CPRChart = ({ 
  data, 
  height = 120, 
  showAxis = false 
}: CPRChartProps) => {
  const chartData = useMemo(() => {
    return data.map(d => ({
      date: new Date(d.recorded_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: d.cpr_value,
    }));
  }, [data]);

  const gradientId = useMemo(() => `cpr-gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  if (chartData.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        No CPR history yet
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id={`${gradientId}-pos`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${gradientId}-neg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          {showAxis && (
            <>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                width={40}
                domain={[-100, 60]}
                tickFormatter={(value) => `${value}%`}
              />
            </>
          )}
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => [
              <span style={{ color: value >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                {value >= 0 ? '+' : ''}{value.toFixed(1)}%
              </span>,
              'CPR'
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill={`url(#${gradientId}-pos)`}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
