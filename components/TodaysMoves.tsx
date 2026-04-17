import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { IconRefresh } from './Icons';

interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  chartData: { time: string; price: number }[];
  loading: boolean;
  error: boolean;
}

const INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^BSESN', name: 'SENSEX' },
  { symbol: '^NSEBANK', name: 'BANKNIFTY' }
];

const TodaysMoves: React.FC = () => {
  const [indicesData, setIndicesData] = useState<IndexData[]>(
    INDICES.map(idx => ({
      ...idx,
      price: 0,
      change: 0,
      percentChange: 0,
      chartData: [],
      loading: true,
      error: false
    }))
  );

  const fetchData = async () => {
    setIndicesData(prev => prev.map(item => ({ ...item, loading: true, error: false })));

    for (const idx of INDICES) {
      try {
        // Fetch 5 days of 15m interval data to ensure we have a good sparkline
        const response = await fetch(`/api/finance-proxy?symbol=${idx.symbol}&range=5d&interval=15m`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        
        const result = data?.chart?.result?.[0];
        if (!result) continue;
        
        const timestamps = result.timestamp || [];
        const closePrices = result.indicators?.quote?.[0]?.close || [];
        const previousClose = result.meta?.chartPreviousClose || 0;

        const chartData: { time: string; price: number }[] = [];
        let latestPrice = 0;

        for (let i = 0; i < timestamps.length; i++) {
          if (closePrices[i] !== null && closePrices[i] !== undefined) {
            chartData.push({
              time: new Date(timestamps[i] * 1000).toLocaleTimeString(),
              price: closePrices[i]
            });
            latestPrice = closePrices[i];
          }
        }

        // Calculate change based on the last available price and previous close
        // If we want "Today's" move, we should ideally compare with yesterday's close.
        // Yahoo Finance meta.chartPreviousClose gives the close before the requested range.
        // Since we requested 5d, chartPreviousClose is 5 days ago.
        // Let's fetch 1d data separately for accurate daily change, or just use 1d range for everything.
        
        // Let's do a 1d fetch for accurate today's data
        const response1d = await fetch(`/api/finance-proxy?symbol=${idx.symbol}&range=1d&interval=5m`);
        if (response1d.ok) {
           const data1d = await response1d.json();
           const result1d = data1d?.chart?.result?.[0];
           if (result1d) {
               const timestamps1d = result1d.timestamp || [];
               const closePrices1d = result1d.indicators?.quote?.[0]?.close || [];
               const prevClose1d = result1d.meta?.chartPreviousClose || 0;
               
               const chartData1d: { time: string; price: number }[] = [];
               let lastPrice1d = 0;
               for (let i = 0; i < timestamps1d.length; i++) {
                 if (closePrices1d[i] !== null && closePrices1d[i] !== undefined) {
                   chartData1d.push({
                     time: new Date(timestamps1d[i] * 1000).toLocaleTimeString(),
                     price: closePrices1d[i]
                   });
                   lastPrice1d = closePrices1d[i];
                 }
               }
    
               if (chartData1d.length > 0) {
                  const change = lastPrice1d - prevClose1d;
                  const percentChange = (change / prevClose1d) * 100;
                  
                  setIndicesData(prev => prev.map(item => 
                    item.symbol === idx.symbol ? {
                      ...item,
                      price: lastPrice1d,
                      change,
                      percentChange,
                      chartData: chartData1d,
                      loading: false
                    } : item
                  ));
                  continue;
               }
           }
        }

        // Fallback to 5d if 1d is empty (e.g. market just opened or weekend)
        const change = latestPrice - previousClose; // This will be 5d change, but better than nothing
        const percentChange = (change / previousClose) * 100;

        setIndicesData(prev => prev.map(item => 
          item.symbol === idx.symbol ? {
            ...item,
            price: latestPrice,
            change,
            percentChange,
            chartData,
            loading: false
          } : item
        ));

      } catch (err) {
        console.error(`Error fetching ${idx.symbol}:`, err);
        setIndicesData(prev => prev.map(item => 
          item.symbol === idx.symbol ? { ...item, loading: false, error: true } : item
        ));
      }
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card-glass-static p-4 shadow-lg relative overflow-hidden mb-6">
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <span className="text-teal-400">📈</span> Today's Moves
        </h2>
        <button 
          onClick={fetchData}
          className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition-colors"
          title="Refresh Indices"
        >
          <IconRefresh className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {indicesData.map(idx => {
          const isPositive = idx.change >= 0;
          const colorClass = isPositive ? 'text-green-400' : 'text-red-400';
          const strokeColor = isPositive ? '#4ade80' : '#f87171';

          return (
            <div key={idx.symbol} className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30 flex flex-col hover:border-teal-500/20 transition-all">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-slate-200">{idx.name}</h3>
                {idx.loading ? (
                  <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                ) : idx.error ? (
                  <span className="text-xs text-slate-500">Error</span>
                ) : (
                  <div className="text-right">
                    <div className="font-bold text-slate-100">
                      {idx.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-xs font-medium ${colorClass}`}>
                      {isPositive ? '+' : ''}{idx.change.toFixed(2)} ({isPositive ? '+' : ''}{idx.percentChange.toFixed(2)}%)
                    </div>
                  </div>
                )}
              </div>
              
              <div className="h-12 w-full mt-auto">
                {!idx.loading && !idx.error && idx.chartData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={idx.chartData}>
                      <YAxis domain={['dataMin', 'dataMax']} hide />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke={strokeColor} 
                        strokeWidth={1.5} 
                        dot={false} 
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TodaysMoves;
