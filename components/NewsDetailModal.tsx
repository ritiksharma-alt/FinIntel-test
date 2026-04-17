import React from 'react';
import { createPortal } from 'react-dom';
import { AnalyzedNewsItem } from '../types';
import { IconX, IconLayers, IconSparkles } from './Icons';

interface NewsDetailModalProps {
  item: AnalyzedNewsItem;
  onClose: () => void;
}

const NewsDetailModal: React.FC<NewsDetailModalProps> = ({ item, onClose }) => {
  const { analysis } = item;
  if (!analysis) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 modal-backdrop transition-opacity" 
        onClick={onClose}
      />
      
      <div className="card-elevated w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col relative animate-entrance-scale">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800/50 flex justify-between items-start bg-slate-900/40">
           <div>
              <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider mb-1 block">
                AI Investor Briefing
              </span>
              <h2 className="text-lg font-bold text-slate-100 leading-snug pr-4">
                {item.title}
              </h2>
           </div>
           <button 
             onClick={onClose}
             className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
           >
             <IconX className="w-5 h-5" />
           </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-5 overflow-y-auto no-scrollbar space-y-6">
            
            {/* Detailed Briefing */}
            <div className="prose prose-sm prose-invert max-w-none">
                <p className="text-slate-300 leading-relaxed text-base whitespace-pre-wrap">
                    {analysis.detailedSummary || analysis.summary}
                </p>
            </div>

            {/* ELI5 Translation */}
            {analysis.eli5 && (
              <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-xl">
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="text-lg">🧢</span>
                      GenZ Translation
                  </h3>
                  <p className="text-sm text-purple-200 font-medium">
                      {analysis.eli5}
                  </p>
              </div>
            )}

            {/* Ripple Effect Recap */}
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <IconLayers className="w-4 h-4 text-blue-400" />
                    Chain Reaction
                </h3>
                <div className="space-y-3 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-[11px] top-2 bottom-4 w-0.5 bg-slate-700/50"></div>
                    
                    <div className="relative pl-8">
                        <div className="absolute left-0 top-1.5 w-6 h-0.5 bg-slate-700"></div>
                        <div className="absolute left-0 top-0 w-3 h-3 rounded-full bg-slate-500 border-2 border-slate-800"></div>
                        <p className="text-xs text-slate-400 uppercase font-semibold">Event</p>
                        <p className="text-sm text-slate-200">{analysis.rippleEffect.trigger}</p>
                    </div>

                    <div className="relative pl-8">
                        <div className="absolute left-0 top-1.5 w-6 h-0.5 bg-slate-700"></div>
                        <div className="absolute left-0 top-0 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-800"></div>
                        <p className="text-xs text-blue-400 uppercase font-semibold">Effect</p>
                        <p className="text-sm text-slate-200">{analysis.rippleEffect.intermediate}</p>
                    </div>

                    <div className="relative pl-8">
                        <div className="absolute left-0 top-1.5 w-6 h-0.5 bg-slate-700"></div>
                         <div className="absolute left-0 top-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-800"></div>
                        <p className="text-xs text-emerald-400 uppercase font-semibold">Impact</p>
                        <p className="text-sm text-slate-200">{analysis.rippleEffect.finalImpact}</p>
                    </div>
                </div>
            </div>

            {/* Why It Matters */}
            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                 <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <IconSparkles className="w-3 h-3" />
                    Why It Matters
                </h3>
                <p className="text-sm text-blue-100/80 italic">
                    {analysis.whyItMatters}
                </p>
            </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/40 flex gap-3">
             <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-center py-3 rounded-xl font-medium transition-all text-sm shadow-lg shadow-teal-500/20"
            >
                Read Original Article
            </a>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default NewsDetailModal;
