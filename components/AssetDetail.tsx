import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnalyzedNewsItem } from '../types';
import NewsCard from './NewsCard';
import { IconChevronDown, IconRefresh } from './Icons';

interface AssetDetailProps {
  assetName: string;
  news: AnalyzedNewsItem[];
  onBack: () => void;
  onAnalyze: (id: string, watchlist: string[]) => void;
  onCollapse: (id: string) => void;
}

const AssetDetail: React.FC<AssetDetailProps> = ({ assetName, news, onBack, onAnalyze, onCollapse }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Extract symbol from asset name (e.g., "HDFC Bank (HDFCBANK)" -> "HDFCBANK.NS")
  const getSymbol = (name: string) => {
    const match = name.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      let sym = match[1].trim().toUpperCase();
      if (sym === 'TATAMOTORS') sym = 'TMPV';
      return sym.includes('.') ? sym : `${sym}.NS`;
    }
    // Fallback mapping for common suggestions without parentheses
    const fallbacks: Record<string, string> = {
      'HDFC BANK': 'HDFCBANK.NS',
      'RELIANCE INDUSTRIES': 'RELIANCE.NS',
      'INFOSYS': 'INFY.NS',
      'TCS': 'TCS.NS',
      'ICICI BANK': 'ICICIBANK.NS',
      'TATA MOTORS': 'TMPV.NS',
      'TATA MOTORS PV': 'TMPV.NS',
      'ITC': 'ITC.NS',
      'SBI': 'SBIN.NS',
      'BAJAJ FINANCE': 'BAJFINANCE.NS',
      'ADANI ENTERPRISES': 'ADANIENT.NS',
      'WIPRO': 'WIPRO.NS',
      'HCL TECH': 'HCLTECH.NS',
      'MARUTI SUZUKI': 'MARUTI.NS',
      'NIFTY 50 ETF': 'NIFTYBEES.NS',
      'GOLD ETF': 'GOLDBEES.NS',
      'LIQUID FUND': 'LIQUIDBEES.NS',
      'SGB (SOVEREIGN GOLD BOND)': 'SGBMAY29.NS',
      'SBI FLEXICAP FUND': '0P0000XW8F.BO'
    };
    const upperName = name.toUpperCase();
    if (fallbacks[upperName]) return fallbacks[upperName];
    
    // Assume the user typed the symbol directly (e.g. "INFY")
    let cleanName = name.toUpperCase().replace(/\s+/g, '');
    if (cleanName === 'TATAMOTORS') cleanName = 'TMPV';
    return cleanName.includes('.') ? cleanName : `${cleanName}.NS`;
  };

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      setError(false);
      try {
        const symbol = getSymbol(assetName);
        const response = await fetch(`/api/finance-proxy?symbol=${symbol}&range=1mo&interval=1d`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        
        const result = data?.chart?.result?.[0];
        if (!result) throw new Error('No result data');
        
        const timestamps = result.timestamp || [];
        const closePrices = result.indicators?.quote?.[0]?.close || [];
        
        let formattedData = [];
        
        if (timestamps.length > 0 && closePrices.length > 0) {
            formattedData = timestamps.map((ts: number, index: number) => {
              const date = new Date(ts * 1000);
              return {
                date: `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`,
                price: (closePrices[index] !== null && closePrices[index] !== undefined) ? Number(closePrices[index].toFixed(2)) : null
              };
            }).filter((item: any) => item.price !== null);
        }
        
        // If no chart data (common for mutual funds), create a single point from regularMarketPrice
        if (formattedData.length === 0) {
            const price = result.meta?.regularMarketPrice || result.meta?.chartPreviousClose || result.meta?.previousClose;
            if (price) {
                formattedData = [{
                    date: 'Latest',
                    price: Number(price.toFixed(2))
                }];
            } else {
                throw new Error('No price data available');
            }
        }

        setChartData(formattedData);
      } catch (err) {
        console.error("Error fetching chart data:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [assetName]);

  // Filter news related to this asset
  const assetNews = news.filter(item => {
    const searchStr = `${item.title} ${item.contentSnippet} ${item.analysis?.relatedStocks?.join(' ') || ''}`.toLowerCase();
    const assetLower = assetName.toLowerCase();
    const symbolMatch = assetName.match(/\(([^)]+)\)/);
    const symbolLower = symbolMatch ? symbolMatch[1].toLowerCase() : '';
    
    return searchStr.includes(assetLower) || (symbolLower && searchStr.includes(symbolLower));
  });

  const latestPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
  const previousPrice = chartData.length > 1 ? chartData[chartData.length - 2].price : 0;
  const priceChange = latestPrice - previousPrice;
  const percentChange = previousPrice ? (priceChange / previousPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="max-w-full mx-auto pb-24">
      <button 
        onClick={onBack}
        className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors"
      >
        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Watchlist
      </button>

      <div className="card-glass-static p-6 mb-6 shadow-lg">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{assetName}</h1>
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="h-8 w-24 bg-slate-800 animate-pulse rounded"></div>
              ) : error ? (
                <span className="text-slate-500 text-sm">Price data unavailable</span>
              ) : (
                <>
                  <span className="text-3xl font-bold font-mono text-white">₹{latestPrice.toLocaleString('en-IN')}</span>
                  <div className={`flex items-center text-sm font-medium px-2 py-1 rounded ${isPositive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{percentChange.toFixed(2)}%)
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <IconRefresh className="w-8 h-8 text-slate-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-700/30 border-dashed">
              Chart data not available for this asset
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  stroke="#64748b" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#21201f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke={isPositive ? '#22c55e' : '#ef4444'} 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 6, fill: isPositive ? '#22c55e' : '#ef4444', stroke: '#0f172a', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-4 text-xs text-slate-500 text-center">
          1 Month Price History
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Related News</h2>
      </div>

      {assetNews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assetNews.map(item => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={item.analysis ? "md:col-span-2" : ""}
            >
              <NewsCard 
                item={item} 
                onAnalyze={(id) => onAnalyze(id, [assetName])} 
                onCollapse={onCollapse}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 card-glass-static">
          <p className="text-slate-400">No recent news found specifically for {assetName}.</p>
          <p className="text-xs text-slate-500 mt-2">Try analyzing general market news to see if it impacts this asset.</p>
        </div>
      )}
    </div>
  );
};

export default AssetDetail;
