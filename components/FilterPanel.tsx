import React from 'react';
import { FilterState, ImpactDirection, ImpactLevel } from '../types';
import { IconX } from './Icons';

interface FilterPanelProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  availableSources: string[];
  availableSectors: string[];
  onClose: () => void;
  resultCount: number;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  setFilters,
  availableSources,
  availableSectors,
  onClose,
  resultCount
}) => {

  const toggleSelection = <T extends string>(
    list: T[],
    item: T,
    key: keyof FilterState
  ) => {
    const exists = list.includes(item);
    const updated = exists 
      ? list.filter(i => i !== item)
      : [...list, item];
    
    setFilters(prev => ({ ...prev, [key]: updated }));
  };

  const clearFilters = () => {
    setFilters({
      sources: [],
      sectors: [],
      impactLevels: [],
      sentiments: [],
      date: null
    });
  };

  const hasFilters = filters.sources.length > 0 || filters.sectors.length > 0 || filters.impactLevels.length > 0 || filters.sentiments.length > 0 || filters.date !== null;

  return (
    <div className="card-glass-static p-4 animate-entrance shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-200">Filters</h3>
        <div className="flex gap-4 items-center">
            {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-teal-400 hover:text-teal-300">
                    Clear All
                </button>
            )}
            <button onClick={onClose}>
                <IconX className="w-5 h-5 text-slate-400" />
            </button>
        </div>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pb-4">
        
        {/* Date Filter */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Date</h4>
          <input 
            type="date" 
            value={filters.date || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value || null }))}
            className="w-full input-dark px-3 py-2 text-sm text-slate-200"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Sources */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sources</h4>
          <div className="flex flex-wrap gap-2">
            {availableSources.map(source => (
              <button
                key={source}
                onClick={() => toggleSelection(filters.sources, source, 'sources')}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filters.sources.includes(source)
                    ? 'bg-teal-600 text-white border-teal-500 shadow-lg shadow-teal-500/20'
                    : 'bg-slate-900/50 text-slate-400 border-slate-700/50 hover:border-teal-500/30 hover:text-teal-400'
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>

        {/* Sentiment */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sentiment</h4>
          <div className="flex flex-wrap gap-2">
            {[ImpactDirection.BULLISH, ImpactDirection.BEARISH, ImpactDirection.NEUTRAL].map(sentiment => (
              <button
                key={sentiment}
                onClick={() => toggleSelection(filters.sentiments, sentiment, 'sentiments')}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filters.sentiments.includes(sentiment)
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900/50 text-slate-400 border-slate-700/50 hover:border-cyan-500/30 hover:text-cyan-400'
                }`}
              >
                {sentiment}
              </button>
            ))}
          </div>
        </div>

        {/* Impact Level */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Impact Level</h4>
          <div className="flex flex-wrap gap-2">
            {[ImpactLevel.HIGH, ImpactLevel.MEDIUM, ImpactLevel.LOW].map(level => (
              <button
                key={level}
                onClick={() => toggleSelection(filters.impactLevels, level, 'impactLevels')}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filters.impactLevels.includes(level)
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/50 text-slate-400 border-slate-700/50 hover:border-emerald-500/30 hover:text-emerald-400'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Sectors */}
        {availableSectors.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sectors (Analyzed News)</h4>
            <div className="flex flex-wrap gap-2">
              {availableSectors.map(sector => (
                <button
                  key={sector}
                  onClick={() => toggleSelection(filters.sectors, sector, 'sectors')}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    filters.sectors.includes(sector)
                      ? 'bg-teal-600 text-white border-teal-500 shadow-lg shadow-teal-500/20'
                      : 'bg-slate-900/50 text-slate-400 border-slate-700/50 hover:border-teal-500/30 hover:text-teal-400'
                  }`}
                >
                  {sector}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
            <button 
                onClick={onClose}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-teal-500/20"
            >
                Show {resultCount} Results
            </button>
        </div>

      </div>
    </div>
  );
};

export default FilterPanel;
