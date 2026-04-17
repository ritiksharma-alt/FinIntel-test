import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BudgetData, BudgetCategory, Transaction } from '../types';
import { IconWallet, IconEdit, IconCheck, IconPlus, IconTrash, IconSparkles } from './Icons';
import { categorizeExpense } from '../services/geminiService';

interface BudgetTrackerProps {
  budgetData: BudgetData;
  onUpdateBudget: (data: BudgetData) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const BudgetMeter = ({ categories, revenue, totalSpent }: { categories: BudgetCategory[], revenue: number, totalSpent: number }) => {
  const TOTAL_TICKS = 45;
  const ticks = [];
  
  for (let i = 0; i < TOTAL_TICKS; i++) {
    const tickThreshold = revenue > 0 ? (i + 0.5) * (revenue / TOTAL_TICKS) : 0;
    let color = '#334155'; // slate-700
    
    if (revenue > 0 && tickThreshold <= totalSpent) {
      let currentSum = 0;
      for (const cat of categories) {
        currentSum += cat.amount;
        if (tickThreshold <= currentSum) {
          color = cat.color;
          break;
        }
      }
    }

    const angle = Math.PI - (i * (Math.PI / (TOTAL_TICKS - 1)));
    const rInner = 100;
    const rOuter = 140;
    const cx = 150;
    const cy = 150;

    const x1 = cx + rInner * Math.cos(angle);
    const y1 = cy - rInner * Math.sin(angle);
    const x2 = cx + rOuter * Math.cos(angle);
    const y2 = cy - rOuter * Math.sin(angle);

    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    );
  }

  const percentSpent = revenue > 0 ? Math.round((totalSpent / revenue) * 100) : 0;

  return (
    <div className="relative w-full flex flex-col items-center justify-center mt-4">
      <svg viewBox="0 0 300 160" className="w-full max-w-[350px] drop-shadow-2xl">
        {ticks}
        <text x="150" y="110" textAnchor="middle" className="fill-slate-400 text-sm font-medium tracking-wide">Spent</text>
        <text x="150" y="145" textAnchor="middle" className="fill-white text-4xl font-bold tracking-tight">
          ₹{totalSpent.toLocaleString('en-IN')}
        </text>
      </svg>
      <div className="flex justify-between w-full max-w-[350px] px-2 mt-2">
        <span className="text-slate-400 text-sm font-medium">{percentSpent}% spent</span>
        <span className="text-slate-400 text-sm font-medium">₹{revenue.toLocaleString('en-IN')} limit</span>
      </div>
    </div>
  );
};

const BudgetTracker: React.FC<BudgetTrackerProps> = ({ budgetData, onUpdateBudget }) => {
  const [isEditingRevenue, setIsEditingRevenue] = useState(false);
  const [tempRevenue, setTempRevenue] = useState(budgetData.revenue.toString());
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('');

  const [aiExpenseInput, setAiExpenseInput] = useState('');
  const [isCategorizing, setIsCategorizing] = useState(false);

  const totalSpent = useMemo(() => {
    return budgetData.categories.reduce((acc, cat) => acc + cat.amount, 0);
  }, [budgetData.categories]);

  const handleSaveRevenue = () => {
    const rev = parseFloat(tempRevenue.replace(/[^0-9.]/g, ''));
    if (!isNaN(rev) && rev >= 0) {
      onUpdateBudget({ ...budgetData, revenue: rev });
      setIsEditingRevenue(false);
    }
  };

  const handleAiExpenseSubmit = async () => {
    if (!aiExpenseInput.trim()) return;
    setIsCategorizing(true);
    try {
      const existingNames = budgetData.categories.map(c => c.name);
      const result = await categorizeExpense(aiExpenseInput, existingNames);
      
      let newCategories = [...budgetData.categories];
      const existingIndex = newCategories.findIndex(c => c.name.toLowerCase() === result.category.toLowerCase());
      
      let categoryId = '';
      if (existingIndex >= 0) {
        categoryId = newCategories[existingIndex].id;
        newCategories[existingIndex] = {
          ...newCategories[existingIndex],
          amount: newCategories[existingIndex].amount + result.amount
        };
      } else {
        categoryId = Date.now().toString();
        newCategories.push({
          id: categoryId,
          name: result.category,
          amount: result.amount,
          color: COLORS[newCategories.length % COLORS.length]
        });
      }

      const newTransaction: Transaction = {
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        description: aiExpenseInput,
        amount: result.amount,
        categoryId: categoryId,
        date: new Date().toISOString()
      };

      onUpdateBudget({
        ...budgetData,
        categories: newCategories,
        transactions: [newTransaction, ...(budgetData.transactions || [])]
      });
      setAiExpenseInput('');
    } catch (error) {
      console.error("Failed to categorize expense", error);
      alert("Failed to categorize expense. Please try again.");
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleDeleteTransaction = (transactionId: string) => {
    const tx = (budgetData.transactions || []).find(t => t.id === transactionId);
    if (!tx) return;

    // Deduct from category
    const newCategories = budgetData.categories.map(c => {
      if (c.id === tx.categoryId) {
        return { ...c, amount: Math.max(0, c.amount - tx.amount) };
      }
      return c;
    });

    onUpdateBudget({
      ...budgetData,
      categories: newCategories,
      transactions: (budgetData.transactions || []).filter(t => t.id !== transactionId)
    });
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const amount = parseFloat(newCategoryAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount < 0) return;

    const newCategory: BudgetCategory = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      amount: amount,
      color: COLORS[budgetData.categories.length % COLORS.length]
    };

    onUpdateBudget({
      ...budgetData,
      categories: [...budgetData.categories, newCategory]
    });
    setNewCategoryName('');
    setNewCategoryAmount('');
  };

  const handleRemoveCategory = (id: string) => {
    onUpdateBudget({
      ...budgetData,
      categories: budgetData.categories.filter(c => c.id !== id)
    });
  };

  const handleUpdateCategoryAmount = (id: string, newAmountStr: string) => {
    const newAmount = parseFloat(newAmountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(newAmount) || newAmount < 0) return;
    onUpdateBudget({
      ...budgetData,
      categories: budgetData.categories.map(c => c.id === id ? { ...c, amount: newAmount } : c)
    });
  };

  const formatInputCurrency = (val: string | number) => {
    const numStr = val.toString().replace(/[^0-9]/g, '');
    if (!numStr) return '';
    return parseInt(numStr, 10).toLocaleString('en-IN');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24 max-w-full mx-auto">
      {/* Revenue / Budget Limit Section */}
      <div className="card-glass-static p-4 shadow-lg flex justify-between items-center">
        <div>
          <p className="text-sm text-slate-400 font-medium mb-1">Monthly Budget Limit</p>
          {isEditingRevenue ? (
            <div className="flex items-center gap-2">
              <span className="text-xl text-slate-400">₹</span>
              <input 
                type="text" 
                value={formatInputCurrency(tempRevenue)}
                onChange={(e) => setTempRevenue(e.target.value.replace(/[^0-9]/g, ''))}
                className="input-dark px-3 py-1 text-xl font-bold text-white w-32"
                autoFocus
              />
            </div>
          ) : (
            <p className="text-2xl font-bold text-white">₹{budgetData.revenue.toLocaleString('en-IN')}</p>
          )}
        </div>
        {!isEditingRevenue ? (
          <button onClick={() => setIsEditingRevenue(true)} className="text-slate-400 hover:text-white p-2 bg-slate-900/50 rounded-full transition-all border border-slate-700/30 hover:border-slate-600">
            <IconEdit className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSaveRevenue} className="text-green-400 hover:text-green-300 p-2 bg-slate-900/50 rounded-full transition-all border border-slate-700/30">
            <IconCheck className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* AI Expense Categorization */}
      <div className="card-glass-static p-4 shadow-lg flex items-center gap-3">
        <IconSparkles className="w-5 h-5 text-purple-400" />
        <input 
          type="text"
          placeholder="Log an expense... (e.g., 'Spent 500 on pizza')"
          value={aiExpenseInput}
          onChange={(e) => setAiExpenseInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAiExpenseSubmit()}
          className="flex-1 bg-transparent border-none focus:outline-none text-slate-200 text-sm placeholder:text-slate-500"
          disabled={isCategorizing}
        />
        <button 
          onClick={handleAiExpenseSubmit}
          disabled={isCategorizing || !aiExpenseInput.trim()}
          className="bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 disabled:opacity-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-cyan-500/20"
        >
          {isCategorizing ? 'Categorizing...' : 'Add'}
        </button>
      </div>

      {/* Meter Chart & Categories */}
      <div className="card-glass-static p-6 shadow-lg flex flex-col items-center">
        <BudgetMeter categories={budgetData.categories} revenue={budgetData.revenue} totalSpent={totalSpent} />
        
        <div className="w-full mt-10">
          <div className="flex flex-wrap justify-center gap-3">
            <AnimatePresence>
              {budgetData.categories.map(cat => (
                <motion.div 
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/30 pl-3 pr-2 py-1.5 rounded-full"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <span className="text-slate-300 text-sm font-medium">{cat.name}</span>
                  <input 
                    type="text"
                    value={formatInputCurrency(cat.amount)}
                    onChange={(e) => handleUpdateCategoryAmount(cat.id, e.target.value)}
                    className="bg-transparent text-right w-16 text-sm text-slate-400 focus:text-white focus:outline-none ml-1"
                  />
                  <button onClick={() => handleRemoveCategory(cat.id)} className="text-slate-500 hover:text-red-400 transition-colors ml-1 p-1">
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Add New Category */}
        <div className="mt-8 w-full max-w-md mx-auto pt-6 border-t border-slate-700/50 flex gap-2">
          <input 
            type="text"
            placeholder="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-1 min-w-0 input-dark px-3 py-2 text-sm text-slate-200"
          />
          <input 
            type="text"
            placeholder="Amount"
            value={formatInputCurrency(newCategoryAmount)}
            onChange={(e) => setNewCategoryAmount(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-24 sm:w-28 shrink-0 input-dark px-3 py-2 text-sm text-slate-200"
          />
          <button 
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim() || !newCategoryAmount}
            className="shrink-0 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white p-2 rounded-lg transition-all shadow-lg shadow-teal-500/20"
          >
            <IconPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      {(budgetData.transactions && budgetData.transactions.length > 0) && (
        <div className="card-glass-static p-4 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Recent Spends</h3>
          <div className="space-y-3">
            <AnimatePresence>
              {budgetData.transactions.map(tx => {
                const category = budgetData.categories.find(c => c.id === tx.categoryId);
                return (
                  <motion.div 
                    key={tx.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                    className="flex items-center gap-4 bg-slate-900/30 p-3 rounded-lg border border-slate-700/30"
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-slate-200 font-medium break-words">{tx.description}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: category?.color || '#94a3b8' }}></div>
                        <span className="text-xs text-slate-400 truncate">{category?.name || 'Unknown'}</span>
                        <span className="text-xs text-slate-500 shrink-0">• {new Date(tx.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="w-px self-stretch bg-slate-600/50 shrink-0"></div>
                    
                    <div className="flex items-center gap-3 shrink-0 min-w-[100px] justify-end">
                      <span className="text-slate-200 font-bold whitespace-nowrap">₹{tx.amount.toLocaleString('en-IN')}</span>
                      <button 
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1 shrink-0"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetTracker;