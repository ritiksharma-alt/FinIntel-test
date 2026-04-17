import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SIPVisualizer = () => {
  const [monthlyInvestment, setMonthlyInvestment] = useState(5000);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [years, setYears] = useState(10);

  const data = useMemo(() => {
    const result = [];
    let totalInvested = 0;
    let totalValue = 0;
    const monthlyRate = expectedReturn / 12 / 100;

    for (let year = 1; year <= years; year++) {
      // Calculate for 12 months
      for (let month = 1; month <= 12; month++) {
        totalInvested += monthlyInvestment;
        totalValue = (totalValue + monthlyInvestment) * (1 + monthlyRate);
      }
      
      result.push({
        year: `Year ${year}`,
        Invested: Math.round(totalInvested),
        Value: Math.round(totalValue)
      });
    }
    return result;
  }, [monthlyInvestment, expectedReturn, years]);

  const finalData = data[data.length - 1] || { Invested: 0, Value: 0 };
  const wealthGained = finalData.Value - finalData.Invested;

  // GenZ Context Generator
  const getContext = (amount: number) => {
    if (amount <= 1000) return "Skipping one fancy coffee a week ☕";
    if (amount <= 3000) return "Skipping one weekend dinner out 🍕";
    if (amount <= 5000) return "Skipping that impulse Zara haul 👕";
    if (amount <= 10000) return "A solid side-hustle income 💻";
    return "Serious investor moves 🐋";
  };

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="max-w-full mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">The Magic of Compounding ✨</h1>
        <p className="text-slate-400 text-sm">See how small habits turn into massive wealth over time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6 card-glass-static p-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Monthly Investment</label>
              <span className="text-teal-400 font-bold">₹{monthlyInvestment.toLocaleString('en-IN')}</span>
            </div>
            <div className="relative pt-8 pb-2">
              <div 
                className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-75"
                style={{ left: `calc(${((monthlyInvestment - 500) / (100000 - 500)) * 100}%)` }}
              >
                <div className="text-[10px] font-medium text-white bg-teal-600 px-2 py-1 rounded shadow-lg shadow-teal-500/30 whitespace-nowrap">
                  {getContext(monthlyInvestment)}
                </div>
                <div className="w-2 h-2 bg-teal-600 rotate-45 -mt-1"></div>
              </div>
              <input 
                type="range" 
                min="500" 
                max="100000" 
                step="500"
                value={monthlyInvestment}
                onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
                className="w-full accent-secondary h-2 rounded-lg appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #14b8a6 ${((monthlyInvestment - 500) / (100000 - 500)) * 100}%, #21201f ${((monthlyInvestment - 500) / (100000 - 500)) * 100}%)` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Expected Return (p.a)</label>
              <span className="text-teal-400 font-bold">{expectedReturn}%</span>
            </div>
            <div className="relative pt-2 pb-2">
              <input 
                type="range" 
                min="5" 
                max="30" 
                step="1"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(Number(e.target.value))}
                className="w-full accent-secondary h-2 rounded-lg appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #14b8a6 ${((expectedReturn - 5) / (30 - 5)) * 100}%, #21201f ${((expectedReturn - 5) / (30 - 5)) * 100}%)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>FD (7%)</span>
              <span>Index (12%)</span>
              <span>Smallcap (15%+)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Time Period</label>
              <span className="text-teal-400 font-bold">{years} Years</span>
            </div>
            <div className="relative pt-2 pb-2">
              <input 
                type="range" 
                min="1" 
                max="40" 
                step="1"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full accent-secondary h-2 rounded-lg appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #14b8a6 ${((years - 1) / (40 - 1)) * 100}%, #21201f ${((years - 1) / (40 - 1)) * 100}%)` }}
              />
            </div>
          </div>
        </div>

        {/* Results & Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
              <p className="text-xs text-slate-400 mb-1">Total Invested</p>
              <p className="text-lg font-bold text-slate-200">{formatCurrency(finalData.Invested)}</p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
              <p className="text-xs text-slate-400 mb-1">Est. Returns</p>
              <p className="text-lg font-bold text-green-400">+{formatCurrency(wealthGained)}</p>
            </div>
            <div className="bg-gradient-to-br from-teal-500/15 to-violet-500/15 p-4 rounded-xl border border-teal-500/20">
              <p className="text-xs text-teal-400 mb-1">Total Value</p>
              <p className="text-xl font-bold text-white">{formatCurrency(finalData.Value)}</p>
            </div>
          </div>

          <div className="card-glass-static p-4 h-80">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2928" vertical={false} />
                <XAxis 
                  dataKey="year" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => val.replace('Year ', '')}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (val >= 10000000) return `${(val / 10000000).toFixed(1)}Cr`;
                    if (val >= 100000) return `${(val / 100000).toFixed(0)}L`;
                    return `${val / 1000}k`;
                  }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#21201f', borderColor: 'rgba(20, 184, 166, 0.15)', borderRadius: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                />
                <Area 
                  type="monotone" 
                  dataKey="Value" 
                  stroke="#14b8a6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  name="Total Value"
                />
                <Area 
                  type="monotone" 
                  dataKey="Invested" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorInvested)" 
                  name="Invested Amount"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SIPVisualizer;
