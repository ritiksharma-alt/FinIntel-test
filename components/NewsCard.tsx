import React, { useState } from 'react';
import { AnalyzedNewsItem, ImpactDirection, ImpactLevel } from '../types';
import { IconTrendingUp, IconTrendingDown, IconMinus, IconSparkles, IconLayers, IconShieldCheck, IconAlertTriangle, IconArrowDown, IconBook, IconExternalLink } from './Icons';
import NewsDetailModal from './NewsDetailModal';

interface NewsCardProps {
  item: AnalyzedNewsItem;
  onAnalyze: (id: string) => void;
  onCollapse: (id: string) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ item, onAnalyze, onCollapse }) => {
  const { analysis, isAnalyzing, analysisError } = item;
  const [showModal, setShowModal] = useState(false);
  const [isELI5Mode, setIsELI5Mode] = useState(false);

  const getImpactColor = (direction: ImpactDirection) => {
    switch (direction) {
      case ImpactDirection.BULLISH: return 'text-bullish bg-emerald-400/10 border-emerald-400/20';
      case ImpactDirection.BEARISH: return 'text-bearish bg-red-400/10 border-red-400/20';
      default: return 'text-neutral bg-slate-400/10 border-slate-400/20';
    }
  };

  const getImpactIcon = (direction: ImpactDirection) => {
    switch (direction) {
      case ImpactDirection.BULLISH: return <IconTrendingUp className="w-4 h-4 mr-1" />;
      case ImpactDirection.BEARISH: return <IconTrendingDown className="w-4 h-4 mr-1" />;
      default: return <IconMinus className="w-4 h-4 mr-1" />;
    }
  };

  const getCredibilityStyles = (score: number) => {
      if (score >= 80) return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: IconShieldCheck };
      if (score >= 50) return { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', icon: IconShieldCheck };
      return { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: IconAlertTriangle };
  };

  return (
    <>
    <div className="card-glass p-4 mb-4 shadow-sm relative overflow-hidden transition-all duration-300 hover-lift">
      {/* Watchlist Highlight */}
      {analysis?.watchlistRelevance?.isRelevant && (
        <div className="absolute top-0 right-0 bg-teal-500/15 text-teal-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider border-b border-l border-teal-500/20">
          In Watchlist
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2 items-center">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/30">
            {item.source}
            </span>
            {/* Credibility Badge (The B.S. Detector) */}
            {analysis?.credibility && (
                <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${getCredibilityStyles(analysis.credibility.score).bg} ${getCredibilityStyles(analysis.credibility.score).border} ${getCredibilityStyles(analysis.credibility.score).color}`}>
                    {React.createElement(getCredibilityStyles(analysis.credibility.score).icon, { className: "w-3 h-3" })}
                    <span className="font-semibold">{analysis.credibility.score}% Reliable</span>
                </div>
            )}
        </div>
        <span className="text-[10px] text-slate-500">
           {new Date(item.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
        </span>
      </div>

      <h3 className="text-base font-semibold text-slate-100 mb-2 leading-tight">
        {item.title}
      </h3>

      {/* Analysis Section or Analyze Action */}
      {!analysis && !isAnalyzing && (
        <div className="mt-3">
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">
            {item.contentSnippet}
          </p>
          <button 
            onClick={() => onAnalyze(item.id)}
            className="w-full flex items-center justify-center gap-2 bg-teal-500/10 hover:bg-teal-500/20 active:bg-teal-500/30 text-teal-300 text-sm font-medium py-2 rounded-lg transition-all border border-teal-500/20 hover:border-teal-500/30"
          >
            <IconSparkles className="w-4 h-4 text-purple-400" />
            Analyze Impact
          </button>
          {analysisError && <p className="text-xs text-red-400 mt-2 text-center">Analysis failed. Please try again.</p>}
        </div>
      )}

      {isAnalyzing && (
        <div className="mt-3 py-4 flex flex-col items-center justify-center space-y-2 bg-teal-500/5 rounded-lg animate-pulse border border-teal-500/10">
           <IconSparkles className="w-5 h-5 text-purple-400 animate-spin" />
           <span className="text-xs text-slate-400">Analyzing ripple effects...</span>
        </div>
      )}

      {analysis && (
        <div className="mt-4 animate-fadeIn relative">
          <button 
              onClick={(e) => { e.stopPropagation(); onCollapse(item.id); }}
              className="absolute -top-2 right-0 flex items-center gap-1 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] px-2 py-1 rounded-full border border-slate-700/50 transition-all z-10"
          >
              <IconMinus className="w-3 h-3" />
              <span>Collapse</span>
          </button>

          {/* Sentiment Badge */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-semibold ${getImpactColor(analysis.impact.direction)}`}>
                {getImpactIcon(analysis.impact.direction)}
                {analysis.impact.direction} • {analysis.impact.level} Impact
            </div>
            {analysis.credibility.score < 50 && (
                <span className="text-[10px] text-red-400 italic">⚠️ {analysis.credibility.verdict}</span>
            )}
          </div>

          {/* Core Analysis */}
          <div className="space-y-3 text-sm">
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/20 relative">
                {analysis.eli5 && (
                  <button 
                    onClick={() => setIsELI5Mode(!isELI5Mode)}
                    className={`absolute top-2 right-2 text-[10px] px-3 py-1.5 rounded-full font-bold transition-all duration-300 shadow-lg border ${
                      isELI5Mode 
                        ? 'bg-purple-600 text-white border-purple-500 shadow-purple-500/30' 
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800 shadow-black/60'
                    }`}
                  >
                    ELI5 Mode {isELI5Mode ? 'ON' : 'OFF'}
                  </button>
                )}
                
                {isELI5Mode && analysis.eli5 ? (
                  <div className="pr-20">
                    <p className="text-purple-300 font-medium text-base leading-relaxed">
                      <span className="text-2xl mr-2">🧢</span>
                      {analysis.eli5}
                    </p>
                  </div>
                ) : (
                  <div className="pr-20">
                    <p className="text-slate-300 mb-2"><span className="text-purple-400 font-semibold">TL;DR:</span> {analysis.summary}</p>
                    <p className="text-slate-400 text-xs italic"><span className="text-blue-400 font-semibold">Why it matters:</span> {analysis.whyItMatters}</p>
                  </div>
                )}
            </div>

            {/* The Ripple Effect (Innovation #1) */}
            {analysis.rippleEffect && (
                 <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-3 rounded-lg border border-slate-700/30 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1 bg-blue-500/20 rounded">
                            <IconLayers className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">The Ripple Effect</h4>
                    </div>
                    
                    <div className="flex flex-col gap-0.5">
                        {/* Trigger */}
                        <div className="flex items-start gap-3">
                             <div className="flex flex-col items-center mt-1">
                                <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                                <div className="w-0.5 h-6 bg-slate-700"></div>
                             </div>
                             <div className="pb-2">
                                <span className="text-[10px] text-slate-500 font-mono">EVENT</span>
                                <p className="text-xs text-slate-200">{analysis.rippleEffect.trigger}</p>
                             </div>
                        </div>

                        {/* Intermediate */}
                        <div className="flex items-start gap-3">
                             <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                <div className="w-0.5 h-6 bg-slate-700"></div>
                             </div>
                             <div className="pb-2">
                                <span className="text-[10px] text-blue-400 font-mono">EFFECT</span>
                                <p className="text-xs text-slate-200">{analysis.rippleEffect.intermediate}</p>
                             </div>
                        </div>

                        {/* Final */}
                        <div className="flex items-start gap-3">
                             <div className="flex flex-col items-center">
                                <IconArrowDown className="w-3 h-3 text-emerald-400" />
                             </div>
                             <div>
                                <span className="text-[10px] text-emerald-400 font-mono">IMPACT</span>
                                <p className="text-xs text-slate-200 font-medium">{analysis.rippleEffect.finalImpact}</p>
                             </div>
                        </div>
                    </div>
                 </div>
            )}

            {/* Watchlist Context */}
            {analysis.watchlistRelevance?.isRelevant && (
                <div className="bg-teal-500/8 p-2 rounded-lg border border-teal-500/15">
                    <p className="text-xs text-teal-200">
                        <span className="font-bold">⚠️ Watchlist Alert:</span> {analysis.watchlistRelevance.reason}
                    </p>
                </div>
            )}
            
            {/* Tags - FIX: Added optional chaining here */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {analysis.relatedStocks?.map(stock => (
                <span key={stock} className="text-[10px] bg-slate-800/60 text-slate-200 px-2 py-0.5 rounded-full border border-slate-700/30">
                  {stock}
                </span>
              ))}
              {analysis.sectors?.map(sector => (
                 <span key={sector} className="text-[10px] bg-teal-500/8 text-teal-400/70 px-2 py-0.5 rounded-full border border-teal-500/10">
                 #{sector}
               </span>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button 
                onClick={() => setShowModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900/50 hover:bg-slate-800 text-slate-200 text-xs py-2 rounded-lg transition-all border border-slate-700/30 hover:border-slate-600"
            >
                <IconBook className="w-3.5 h-3.5" />
                Read Briefing
            </button>
            <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900/50 hover:bg-slate-800 text-slate-200 text-xs py-2 rounded-lg transition-all border border-slate-700/30 hover:border-slate-600"
            >
                <IconExternalLink className="w-3.5 h-3.5" />
                Original Source
            </a>
          </div>
        </div>
      )}
    </div>
    
    {showModal && (
        <NewsDetailModal 
            item={item} 
            onClose={() => setShowModal(false)} 
        />
    )}
    </>
  );
};

export default NewsCard;
