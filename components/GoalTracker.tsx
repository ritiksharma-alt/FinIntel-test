import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Goal } from '../types';
import { IconPlus, IconTrash, IconCheck } from './Icons';

interface GoalTrackerProps {
  goals: Goal[];
  onUpdateGoals: (goals: Goal[]) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const GoalTracker: React.FC<GoalTrackerProps> = ({ goals, onUpdateGoals }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  
  const [addFundsId, setAddFundsId] = useState<string | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleAddGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget || !newGoalDate) return;
    
    const target = parseFloat(newGoalTarget.replace(/[^0-9.]/g, ''));
    if (isNaN(target) || target <= 0) return;

    const newGoal: Goal = {
      id: Date.now().toString(),
      name: newGoalName.trim(),
      targetAmount: target,
      currentAmount: 0,
      targetDate: newGoalDate,
      color: COLORS[goals.length % COLORS.length]
    };

    onUpdateGoals([...goals, newGoal]);
    setIsAdding(false);
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalDate('');
  };

  const handleDeleteGoal = (id: string) => {
    onUpdateGoals(goals.filter(g => g.id !== id));
  };

  const handleAddFunds = (id: string) => {
    const amount = parseFloat(addFundsAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount <= 0) return;

    onUpdateGoals(goals.map(g => {
      if (g.id === id) {
        return { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) };
      }
      return g;
    }));
    
    setAddFundsId(null);
    setAddFundsAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Savings Goals</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 border border-teal-500/20"
        >
          <IconPlus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-4 space-y-4"
        >
          <input 
            type="text"
            placeholder="Goal Name (e.g., Emergency Fund)"
            value={newGoalName}
            onChange={(e) => setNewGoalName(e.target.value)}
            className="w-full input-dark px-3 py-2 text-sm text-slate-200"
          />
          <div className="flex gap-3">
            <input 
              type="text"
              placeholder="Target Amount"
              value={newGoalTarget}
              onChange={(e) => setNewGoalTarget(e.target.value.replace(/[^0-9]/g, ''))}
              className="flex-1 input-dark px-3 py-2 text-sm text-slate-200"
            />
            <input 
              type="date"
              value={newGoalDate}
              onChange={(e) => setNewGoalDate(e.target.value)}
              className="flex-1 input-dark px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddGoal}
              disabled={!newGoalName.trim() || !newGoalTarget || !newGoalDate}
              className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-teal-500/20"
            >
              Save Goal
            </button>
          </div>
        </motion.div>
      )}

      {goals.length === 0 && !isAdding ? (
        <div className="text-center py-10 bg-slate-900/30 rounded-xl border border-slate-700/30 border-dashed">
          <p className="text-slate-400 mb-2">No savings goals yet.</p>
          <p className="text-sm text-slate-500">Set a goal to start tracking your progress.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => {
            const progress = Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100));
            const isCompleted = progress >= 100;
            const targetDate = new Date(goal.targetDate);
            const today = new Date();
            const monthsLeft = Math.max(0, (targetDate.getFullYear() - today.getFullYear()) * 12 + targetDate.getMonth() - today.getMonth());
            
            return (
              <motion.div 
                key={goal.id}
                layout
                className="card-glass p-4 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-200 flex items-center gap-2">
                      {goal.name}
                      {isCompleted && <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Completed</span>}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Target: {formatCurrency(goal.targetAmount)} by {targetDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      {monthsLeft > 0 && !isCompleted && ` (${monthsLeft} months left)`}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 font-medium">{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-slate-400">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: goal.color }}
                    />
                  </div>
                </div>

                {!isCompleted && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    {addFundsId === goal.id ? (
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Amount to add"
                          value={addFundsAmount}
                          onChange={(e) => setAddFundsAmount(e.target.value.replace(/[^0-9]/g, ''))}
                          className="flex-1 input-dark px-3 py-1.5 text-sm text-slate-200"
                          autoFocus
                        />
                        <button 
                          onClick={() => handleAddFunds(goal.id)}
                          disabled={!addFundsAmount}
                          className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                        >
                          Add
                        </button>
                        <button 
                          onClick={() => { setAddFundsId(null); setAddFundsAmount(''); }}
                          className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setAddFundsId(goal.id)}
                        className="text-sm text-teal-400 hover:text-teal-300 font-medium transition-all"
                      >
                        + Add Funds
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalTracker;
