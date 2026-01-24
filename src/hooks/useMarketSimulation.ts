import { useState, useEffect, useCallback } from 'react';

interface MarketData {
  time: string;
  value: number;
  timestamp: number;
}

interface MarketStatus {
  status: 'rising' | 'falling' | 'volatile';
  message: string;
  sentiment: number; // -100 to 100
}

export const useMarketSimulation = () => {
  const [chartData, setChartData] = useState<MarketData[]>([]);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({
    status: 'rising',
    message: 'Market Rising',
    sentiment: 65,
  });

  const generateInitialData = useCallback(() => {
    const data: MarketData[] = [];
    let value = 1000 + Math.random() * 200;
    const now = Date.now();
    
    for (let i = 30; i >= 0; i--) {
      const change = (Math.random() - 0.48) * 20;
      value = Math.max(800, Math.min(1400, value + change));
      data.push({
        time: new Date(now - i * 1000 * 60).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        value: Math.round(value * 100) / 100,
        timestamp: now - i * 1000 * 60,
      });
    }
    return data;
  }, []);

  const updateMarket = useCallback(() => {
    setChartData(prev => {
      if (prev.length === 0) return generateInitialData();
      
      const lastValue = prev[prev.length - 1].value;
      const trend = Math.random();
      let change: number;
      
      // Create more realistic market movement
      if (trend > 0.7) {
        change = Math.random() * 15 + 5; // Strong up
      } else if (trend > 0.4) {
        change = (Math.random() - 0.5) * 10; // Sideways
      } else if (trend > 0.2) {
        change = -(Math.random() * 15 + 5); // Strong down
      } else {
        change = (Math.random() - 0.5) * 30; // Volatile
      }
      
      const newValue = Math.max(700, Math.min(1500, lastValue + change));
      const now = Date.now();
      
      const newData = [...prev.slice(-29), {
        time: new Date(now).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        value: Math.round(newValue * 100) / 100,
        timestamp: now,
      }];

      // Update market status based on recent trend
      const recentValues = newData.slice(-5).map(d => d.value);
      const avgChange = (recentValues[recentValues.length - 1] - recentValues[0]) / recentValues[0] * 100;
      
      if (Math.abs(avgChange) > 2) {
        if (avgChange > 0) {
          setMarketStatus({
            status: 'rising',
            message: 'Market Rising',
            sentiment: Math.min(100, 60 + avgChange * 10),
          });
        } else {
          setMarketStatus({
            status: 'falling',
            message: 'Market Falling',
            sentiment: Math.max(-100, -60 + avgChange * 10),
          });
        }
      } else {
        setMarketStatus({
          status: 'volatile',
          message: 'High Volatility',
          sentiment: Math.random() * 40 - 20,
        });
      }

      return newData;
    });
  }, [generateInitialData]);

  useEffect(() => {
    // Initialize with data
    setChartData(generateInitialData());
    
    // Update every 2 seconds
    const interval = setInterval(updateMarket, 2000);
    
    return () => clearInterval(interval);
  }, [generateInitialData, updateMarket]);

  return { chartData, marketStatus };
};
