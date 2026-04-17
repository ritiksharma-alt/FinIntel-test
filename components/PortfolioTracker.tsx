import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PortfolioItem, AssetType } from '../types';
import { IconRefresh, IconChevronUp, IconChevronDown, IconSparkles, IconX } from './Icons';
import { roastPortfolio } from '../services/geminiService';

interface PortfolioTrackerProps {
  portfolio: PortfolioItem[];
  watchlist: string[];
  onUpdatePortfolio: (data: PortfolioItem[]) => void;
}

interface LivePriceData {
  [symbol: string]: {
    price: number;
    loading: boolean;
    error: boolean;
  };
}

const PortfolioTracker: React.FC<PortfolioTrackerProps> = ({ portfolio, watchlist, onUpdatePortfolio }) => {
  const [livePrices, setLivePrices] = useState<LivePriceData>({});
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRoasting, setIsRoasting] = useState(false);
  const [roastResult, setRoastResult] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    quantity: '', 
    averagePrice: '', 
    investedAmount: '',
    investmentDate: '',
    type: 'Stock' as AssetType 
  });

  const handleRoast = async () => {
    setIsRoasting(true);
    setRoastResult(null);
    try {
      const result = await roastPortfolio(portfolio);
      setRoastResult(result);
    } catch (error) {
      console.error("Failed to roast portfolio", error);
      setRoastResult("The AI is too stunned to speak. Try again later. 💀");
    } finally {
      setIsRoasting(false);
    }
  };

  const formatInputCurrency = (value: string | number) => {
    if (!value) return '';
    const numStr = value.toString().replace(/[^0-9.]/g, '');
    if (!numStr) return '';
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1].slice(0, 2) : '';
    const formattedInteger = Number(integerPart).toLocaleString('en-IN');
    return formattedInteger + decimalPart;
  };

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

  const fetchLivePrices = async () => {
    const symbolsToFetch = watchlist;
    if (symbolsToFetch.length === 0) return;

    // Set loading state
    setLivePrices(prev => {
      const next = { ...prev };
      symbolsToFetch.forEach(sym => {
        if (!next[sym]) next[sym] = { price: 0, loading: true, error: false };
        else next[sym].loading = true;
      });
      return next;
    });

    for (const symbol of symbolsToFetch) {
      try {
        const querySymbol = getSymbol(symbol);

        const response = await fetch(`/api/finance-proxy?symbol=${querySymbol}&range=1d&interval=1d`);
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if (!result) throw new Error('No result data');
        
        const closePrices = result.indicators?.quote?.[0]?.close;
        
        let latestPrice = 0;
        if (closePrices && Array.isArray(closePrices) && closePrices.length > 0) {
            // Find the last valid (non-null) price
            for (let i = closePrices.length - 1; i >= 0; i--) {
                if (closePrices[i] !== null && closePrices[i] !== undefined) {
                    latestPrice = closePrices[i];
                    break;
                }
            }
        }
        
        if (!latestPrice) {
             // Fallback to regularMarketPrice or previousClose (common for mutual funds)
             latestPrice = result.meta?.regularMarketPrice || result.meta?.chartPreviousClose || result.meta?.previousClose || 0;
        }
        
        if (!latestPrice) {
            throw new Error('No price available');
        }

        setLivePrices(prev => ({
          ...prev,
          [symbol]: { price: latestPrice, loading: false, error: false }
        }));
      } catch (err) {
        console.error(`Failed to fetch price for ${symbol}`, err);
        setLivePrices(prev => ({
          ...prev,
          [symbol]: { price: prev[symbol]?.price || 0, loading: false, error: true }
        }));
      }
    }
  };

  useEffect(() => {
    fetchLivePrices();
    // Refresh prices every 5 minutes
    const interval = setInterval(fetchLivePrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [watchlist]); // Re-fetch when watchlist changes

  const guessType = (stock: string): AssetType => {
    const upper = stock.toUpperCase();
    if (upper.includes('ETF') || upper.includes('BEES')) return 'ETF';
    return 'Stock';
  };

  const handleEditClick = (stock: string) => {
    const existing = portfolio.find(p => p.symbol === stock);
    setEditingSymbol(stock);
    setEditForm({
      quantity: existing ? existing.quantity.toString() : '',
      averagePrice: existing ? existing.averagePrice.toString() : '',
      investedAmount: '',
      investmentDate: '',
      type: existing ? existing.type : guessType(stock)
    });
  };

  const handleSaveEdit = (stock: string) => {
    const qty = parseFloat(editForm.quantity.replace(/[^0-9.]/g, ''));
    const avg = parseFloat(editForm.averagePrice.replace(/[^0-9.]/g, ''));
    
    const validQty = isNaN(qty) ? 0 : qty;
    const validAvg = isNaN(avg) ? 0 : avg;

    const newItem: PortfolioItem = {
      id: stock,
      symbol: stock,
      name: stock,
      type: editForm.type,
      quantity: validQty,
      averagePrice: validAvg,
    };

    const existingIndex = portfolio.findIndex(p => p.symbol === stock);
    let newPortfolio = [...portfolio];
    
    const isValid = validQty > 0;

    if (isValid) {
      if (existingIndex >= 0) {
        newPortfolio[existingIndex] = newItem;
      } else {
        newPortfolio.push(newItem);
      }
    } else {
      // If qty is 0, remove from portfolio tracking
      if (existingIndex >= 0) {
        newPortfolio.splice(existingIndex, 1);
      }
    }
    
    onUpdatePortfolio(newPortfolio);
    setEditingSymbol(null);
  };

  // Calculations
  const stats = useMemo(() => {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    
    const byType = {
      Stock: { invested: 0, current: 0 },
      ETF: { invested: 0, current: 0 }
    };

    watchlist.forEach(stock => {
      const item = portfolio.find(p => p.symbol === stock);
      if (!item || item.quantity <= 0) return;

      const invested = item.quantity * item.averagePrice;
      const currentPrice = livePrices[stock]?.price || item.averagePrice;
      const current = item.quantity * currentPrice;

      totalInvested += invested;
      totalCurrentValue += current;

      if (byType[item.type]) {
        byType[item.type].invested += invested;
        byType[item.type].current += current;
      }
    });

    const calculatePL = (invested: number, current: number) => {
      if (invested === 0) return { amount: 0, percentage: 0, isPositive: true };
      const amount = current - invested;
      const percentage = (amount / invested) * 100;
      return { amount, percentage, isPositive: amount >= 0 };
    };

    return {
      total: {
        invested: totalInvested,
        current: totalCurrentValue,
        ...calculatePL(totalInvested, totalCurrentValue)
      },
      types: {
        Stock: calculatePL(byType.Stock.invested, byType.Stock.current),
        ETF: calculatePL(byType.ETF.invested, byType.ETF.current)
      }
    };
  }, [portfolio, watchlist, livePrices]);

  const holdingsWatchlist = useMemo(() => {
    return watchlist.filter(stock => {
      const upper = stock.toUpperCase();
      return !(upper.includes('FUND') || upper.includes('MF'));
    });
  }, [watchlist]);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">My Portfolio</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRoast}
            disabled={isRoasting}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 text-orange-400 px-3 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 border border-orange-500/20"
          >
            <IconSparkles className="w-4 h-4" />
            {isRoasting ? 'Cooking...' : 'Roast Me 🔥'}
          </button>
          <button 
            onClick={fetchLivePrices}
            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
            title="Refresh Prices"
          >
            <IconRefresh className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {roastResult && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 p-4 rounded-xl relative"
          >
            <button 
              onClick={() => setRoastResult(null)}
              className="absolute top-2 right-2 text-orange-400/60 hover:text-orange-400 p-1"
            >
              <IconX className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔥</div>
              <div>
                <h3 className="text-orange-400 font-bold mb-1">Portfolio Roast</h3>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{roastResult}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-glass-static p-4 shadow-lg">
          <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Total P&L</p>
          <div className="flex items-end gap-2">
            <span className={`text-xl font-bold ${stats.total.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {stats.total.isPositive ? '+' : ''}₹{Math.abs(stats.total.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className={`text-sm font-medium mt-1 ${stats.total.isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {stats.total.isPositive ? '▲' : '▼'} {Math.abs(stats.total.percentage).toFixed(2)}%
          </div>
        </div>

        {['Stock', 'ETF'].map((type) => {
          const typeStats = stats.types[type as AssetType];
          return (
            <div key={type} className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
              <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">{type} P&L</p>
              <div className={`text-lg font-bold ${typeStats.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {typeStats.isPositive ? '+' : ''}{Math.abs(typeStats.percentage).toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Holdings List */}
      <div className="card-glass-static overflow-hidden">
        <div className="p-4 border-b border-slate-700/30 flex justify-between items-center">
          <div>
            <h3 className="font-medium text-slate-200">Watchlist Holdings</h3>
            <p className="text-xs text-slate-400 mt-1">Add quantity and average price to track your investments.</p>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
          >
            {isExpanded ? <IconChevronUp className="w-5 h-5" /> : <IconChevronDown className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/40 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Asset</th>
                      <th className="px-4 py-3 font-medium text-right">Qty</th>
                      <th className="px-4 py-3 font-medium text-right">Avg Price</th>
                      <th className="px-4 py-3 font-medium text-right">LTP</th>
                      <th className="px-4 py-3 font-medium text-right">P&L</th>
                      <th className="px-4 py-3 font-medium text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {holdingsWatchlist.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                          No stocks or ETFs in your watchlist. Add them below to track holdings here.
                        </td>
                      </tr>
                    ) : (
                      holdingsWatchlist.map(stock => {
                        const item = portfolio.find(p => p.symbol === stock);
                        const liveData = livePrices[stock];
                        const currentPrice = liveData?.price || item?.averagePrice || 0;
                        const qty = item?.quantity || 0;
                        const avgPrice = item?.averagePrice || 0;
                        
                        const invested = qty * avgPrice;
                        const current = qty * currentPrice;
                        const pl = current - invested;
                        
                        let plPercent = invested > 0 ? (pl / invested) * 100 : 0;
                        
                        const isPositive = pl >= 0;
                        const isEditing = editingSymbol === stock;

                        return (
                          <tr key={stock} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-200">{stock}</div>
                              {!isEditing && item && <div className="text-[10px] text-slate-500 bg-slate-800 inline-block px-1.5 rounded mt-0.5">{item.type}</div>}
                            </td>
                            {isEditing ? (
                              <td colSpan={4} className="px-4 py-2">
                                <div className="flex items-center gap-2 justify-end">
                                  <select 
                                    value={editForm.type}
                                    onChange={e => setEditForm({...editForm, type: e.target.value as AssetType})}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                  >
                                    <option value="Stock">Stock</option>
                                    <option value="ETF">ETF</option>
                                  </select>
                                  
                                  <input 
                                    type="text" 
                                    placeholder="Qty" 
                                    value={formatInputCurrency(editForm.quantity)}
                                    onChange={e => setEditForm({...editForm, quantity: e.target.value.replace(/[^0-9.]/g, '')})}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white w-20 text-right"
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="Avg Price" 
                                    value={formatInputCurrency(editForm.averagePrice)}
                                    onChange={e => setEditForm({...editForm, averagePrice: e.target.value.replace(/[^0-9.]/g, '')})}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white w-24 text-right"
                                  />
                                </div>
                              </td>
                            ) : (
                              <>
                                <td className="px-4 py-3 text-right text-slate-300">{qty > 0 ? qty : '-'}</td>
                                <td className="px-4 py-3 text-right text-slate-300">
                                  {avgPrice > 0 ? `₹${avgPrice.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {liveData?.loading ? (
                                    <span className="text-slate-500 text-xs animate-pulse">Loading...</span>
                                  ) : liveData?.error ? (
                                    <span className="text-slate-500 text-xs">N/A</span>
                                  ) : currentPrice > 0 ? (
                                    <span className="text-slate-200">
                                      ₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {invested > 0 ? (
                                    <>
                                      <div className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                        {isPositive ? '+' : ''}₹{Math.abs(pl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                      </div>
                                      <div className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                        {isPositive ? '+' : ''}{plPercent.toFixed(2)}%
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-slate-500">-</span>
                                  )}
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handleSaveEdit(stock)} className="text-green-400 hover:text-green-300 font-medium">Save</button>
                                  <button onClick={() => setEditingSymbol(null)} className="text-slate-400 hover:text-slate-300">Cancel</button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleEditClick(stock)}
                                  className="text-teal-400 hover:text-teal-300 text-xs font-medium px-2 py-1 rounded hover:bg-teal-500/10 transition-all"
                                >
                                  {qty > 0 ? 'Edit' : 'Add Holdings'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PortfolioTracker;
