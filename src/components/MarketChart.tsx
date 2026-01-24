import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

interface MarketChartProps {
  data: Array<{ time: string; value: number }>;
  height?: number;
  showAxis?: boolean;
  gradient?: boolean;
}

export const MarketChart = ({ 
  data, 
  height = 200, 
  showAxis = false,
  gradient = true 
}: MarketChartProps) => {
  const isPositive = useMemo(() => {
    if (data.length < 2) return true;
    return data[data.length - 1].value >= data[0].value;
  }, [data]);

  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop 
                offset="0%" 
                stopColor={isPositive ? "hsl(142, 76%, 45%)" : "hsl(0, 84%, 60%)"} 
                stopOpacity={0.4} 
              />
              <stop 
                offset="100%" 
                stopColor={isPositive ? "hsl(142, 76%, 45%)" : "hsl(0, 84%, 60%)"} 
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
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                width={40}
                domain={['auto', 'auto']}
              />
            </>
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? "hsl(142, 76%, 45%)" : "hsl(0, 84%, 60%)"}
            strokeWidth={2}
            fill={gradient ? `url(#${gradientId})` : 'transparent'}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
