import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { fetchNews } from './services/newsService';
import { analyzeArticle } from './services/geminiService';
import { addToWatchlist, getWatchlist, removeFromWatchlist, getNewsCache, saveNewsCache, setWatchlistInStorage, getLocalBudget, setLocalBudget, getLocalPortfolio, setLocalPortfolio, getLocalGoals, setLocalGoals } from './services/storageService';
import { AnalyzedNewsItem, ViewState, FilterState, ImpactLevel, BudgetData, PortfolioItem, Goal } from './types';
import { STOCK_SUGGESTIONS, MASTER_STOCK_LIST } from './constants';
import NewsCard from './components/NewsCard';
import FilterPanel from './components/FilterPanel';
import Profile from './components/Profile';
import AssetDetail from './components/AssetDetail';
import BudgetTracker from './components/BudgetTracker';
import FinancialBot from './components/FinancialBot';
import PortfolioTracker from './components/PortfolioTracker';
import TodaysMoves from './components/TodaysMoves';
import SIPVisualizer from './components/SIPVisualizer';
import GoalTracker from './components/GoalTracker';
import InteractiveGridBackground from './components/InteractiveGridBackground';
import { IconHome, IconList, IconPlus, IconSparkles, IconTrash, IconFilter, IconRefresh, IconSearch, IconX, IconUser, IconWallet, IconBot, IconCalculator } from './components/Icons';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { loginWithGoogle, logoutUser, syncWatchlistToCloud, updateCloudWatchlist, getUserData, syncBudgetToCloud, updateCloudBudget, syncPortfolioToCloud, updateCloudPortfolio, syncGoalsToCloud, updateCloudGoals } from './services/firebaseService';

const App = () => {
  const [activeView, setActiveView] = useState<ViewState>('feed');
  const [news, setNews] = useState<AnalyzedNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [newStockInput, setNewStockInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [customPhotoURL, setCustomPhotoURL] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [visibleNewsCount, setVisibleNewsCount] = useState(30);
  const [budgetData, setBudgetData] = useState<BudgetData>({ revenue: 0, categories: [] });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeTool, setActiveTool] = useState<'sip' | 'goals'>('sip');
  const [isBotOpen, setIsBotOpen] = useState(false);
  
  // Filtering State
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    sources: [],
    sectors: [],
    impactLevels: [],
    sentiments: [],
    date: null
  });

  // Use refs to access latest state inside intervals without re-triggering effects
  const newsRef = useRef<AnalyzedNewsItem[]>([]);
  
  useEffect(() => {
      newsRef.current = news;
  }, [news]);

  // Initial Load & Polling Logic
  useEffect(() => {
    const initialize = async () => {
        // 1. Load Watchlist
        const savedWatchlist = getWatchlist();
        setWatchlist(savedWatchlist);

        // Load Budget
        const savedBudget = getLocalBudget();
        if (savedBudget) {
            setBudgetData(savedBudget);
        }

        // Load Portfolio
        const savedPortfolio = getLocalPortfolio();
        if (savedPortfolio) {
            setPortfolio(savedPortfolio);
        }

        // Load Goals
        const savedGoals = getLocalGoals();
        if (savedGoals) {
            setGoals(savedGoals);
        }

        // 2. Load Cached News (Fast Render)
        const cachedNews = getNewsCache();
        if (cachedNews.length > 0) {
            setNews(cachedNews);
            setLoading(false);
        }

        // 3. Initial Fetch
        await fetchAndMergeNews();
        setLoading(false);
    };

    initialize();

    // 4. Set up dynamic polling (2 mins during market hours, 7 mins otherwise)
    let timeoutId: NodeJS.Timeout;
    const scheduleNextFetch = () => {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (330 * 60000)); // IST is UTC+5:30
        
        const hour = ist.getHours();
        const minute = ist.getMinutes();
        const day = ist.getDay();
        
        // Market hours: Mon-Fri, 9:05 AM to 3:30 PM (15:30)
        const isWeekday = day >= 1 && day <= 5;
        const isMarketHours = isWeekday && 
            (hour > 9 || (hour === 9 && minute >= 5)) && 
            (hour < 15 || (hour === 15 && minute <= 30));
            
        const delayMs = isMarketHours ? 2 * 60 * 1000 : 7 * 60 * 1000;
        
        timeoutId = setTimeout(() => {
            fetchAndMergeNews().finally(() => {
                scheduleNextFetch();
            });
        }, delayMs);
    };
    scheduleNextFetch();

    // 5. Auth State Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userData = await getUserData(currentUser.uid);
          if (userData?.customPhotoURL) {
            setCustomPhotoURL(userData.customPhotoURL);
          }
          const currentLocal = getWatchlist();
          const merged = await syncWatchlistToCloud(currentUser.uid, currentLocal);
          setWatchlist(merged);
          setWatchlistInStorage(merged);

          const mergedBudget = await syncBudgetToCloud(currentUser.uid, getLocalBudget());
          if (mergedBudget) {
              setBudgetData(mergedBudget);
              setLocalBudget(mergedBudget);
          }

          const mergedPortfolio = await syncPortfolioToCloud(currentUser.uid, getLocalPortfolio());
          if (mergedPortfolio) {
              setPortfolio(mergedPortfolio);
              setLocalPortfolio(mergedPortfolio);
          }

          const mergedGoals = await syncGoalsToCloud(currentUser.uid, getLocalGoals());
          if (mergedGoals) {
              setGoals(mergedGoals);
              setLocalGoals(mergedGoals);
          }
        } catch (e) {
          console.error("Failed to sync data", e);
        }
      } else {
        setCustomPhotoURL(null);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribeAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const fetchAndMergeNews = async () => {
    try {
        const freshItems = await fetchNews();
        const currentNews = newsRef.current;
        const currentIds = new Set(currentNews.map(n => n.id));
        
        // Identify truly new items
        const newItems = freshItems.filter(item => !currentIds.has(item.id));
        
        if (newItems.length === 0) {
            // No new news, just clean up old stuff
            const cleaned = cleanOldNews(currentNews);
            if (cleaned.length !== currentNews.length) {
                setNews(cleaned);
                saveNewsCache(cleaned);
            }
            return;
        }

        // Merge: New items + Existing items (preserving analysis)
        // Add isAnalyzing: false to new items
        const newAnalyzedItems: AnalyzedNewsItem[] = newItems.map(item => ({
            ...item,
            isAnalyzing: false
        }));

        let merged = [...newAnalyzedItems, ...currentNews];
        
        // Clean up items older than 6 days
        merged = cleanOldNews(merged);

        // Sort by date
        merged.sort((a, b) => b.isoDate.getTime() - a.isoDate.getTime());

        setNews(merged);
        saveNewsCache(merged);

        // Optional: Auto-analyze top new item if it's very fresh? 
        // For MVP, we let user initiate or rely on manual clicks to save tokens.
        
    } catch (e) {
        console.error("Polling error", e);
    }
  };

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await fetchAndMergeNews();
    
    // Show success toast
    setToastMessage("Successfully refreshed");
    setTimeout(() => setToastMessage(null), 3000);

    // Keep spinner going a bit longer for visual feedback
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const cleanOldNews = (items: AnalyzedNewsItem[]) => {
      const now = new Date().getTime();
      const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;
      return items.filter(n => (now - n.isoDate.getTime()) < SIX_DAYS_MS);
  };

  const handleAnalyze = async (id: string, currentWatchlist: string[], currentNewsState = news) => {
    const itemIndex = currentNewsState.findIndex(n => n.id === id);
    if (itemIndex === -1) return;
    
    // Prevent double analysis
    if (currentNewsState[itemIndex].analysis || currentNewsState[itemIndex].isAnalyzing) return;

    // Set analyzing state
    const updatedWithLoading = currentNewsState.map(n => n.id === id ? { ...n, isAnalyzing: true, analysisError: false } : n);
    setNews(updatedWithLoading);

    try {
      const item = currentNewsState[itemIndex];
      const analysis = await analyzeArticle(item.title, item.contentSnippet, currentWatchlist);
      
      const finalState = updatedWithLoading.map(n => n.id === id ? { ...n, isAnalyzing: false, analysis: analysis } : n);
      setNews(finalState);
      saveNewsCache(finalState); // Save analysis result
    } catch (e) {
      setNews(prev => prev.map(n => n.id === id ? { ...n, isAnalyzing: false, analysisError: true } : n));
    }
  };

  const handleCollapse = (id: string) => {
    setNews(prev => prev.map(n => n.id === id ? { ...n, analysis: undefined } : n));
  };

  const handleAddToWatchlist = (e?: React.FormEvent, stockName?: string) => {
    e?.preventDefault();
    const stockToAdd = stockName || newStockInput;
    if (!stockToAdd.trim()) return;
    // Store the full string (e.g., "Reliance (RELIANCE)") or just the input
    const formattedStock = stockToAdd.trim(); 
    // Check if already exists (case insensitive check, but store original casing)
    if (watchlist.some(w => w.toUpperCase() === formattedStock.toUpperCase())) {
        setNewStockInput('');
        return;
    }
    const updated = addToWatchlist(formattedStock);
    setWatchlist(updated);
    setNewStockInput('');

    if (user) {
        updateCloudWatchlist(user.uid, updated).catch(console.error);
    }
  };
  
  const handleRemoveFromWatchlist = (stock: string) => {
    const updated = removeFromWatchlist(stock);
    setWatchlist(updated);

    if (user) {
        updateCloudWatchlist(user.uid, updated).catch(console.error);
    }
  };

  const handleUpdateBudget = (newData: BudgetData) => {
    setBudgetData(newData);
    setLocalBudget(newData);
    if (user) {
        updateCloudBudget(user.uid, newData).catch(console.error);
    }
  };

  const handleUpdateGoals = (newGoals: Goal[]) => {
    setGoals(newGoals);
    setLocalGoals(newGoals);
    if (user) {
        updateCloudGoals(user.uid, newGoals).catch(console.error);
    }
  };

  const handleUpdatePortfolio = (newData: PortfolioItem[]) => {
    setPortfolio(newData);
    setLocalPortfolio(newData);
    if (user) {
        updateCloudPortfolio(user.uid, newData).catch(console.error);
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      setToastMessage("Successfully logged in");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      setToastMessage("Login failed");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setToastMessage("Successfully logged out");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePhotoUpdated = (newUrl: string) => {
    setCustomPhotoURL(newUrl);
  };

  // --- Derived Data for Filtering ---

  const availableSources = useMemo(() => {
    const sources = new Set(news.map(n => n.source));
    return Array.from(sources).sort();
  }, [news]);

  const availableSectors = useMemo(() => {
    const sectors = new Set<string>();
    news.forEach(n => {
      // Fix: Add optional chaining to prevent crash if sectors is undefined
      n.analysis?.sectors?.forEach(s => sectors.add(s));
    });
    return Array.from(sectors).sort();
  }, [news]);

  const filteredNews = useMemo(() => {
    return news.filter(item => {
      // Search Filter
      if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = item.title.toLowerCase().includes(query);
          const matchesContent = item.contentSnippet.toLowerCase().includes(query);
          const matchesSummary = item.analysis?.summary?.toLowerCase().includes(query);
          if (!matchesTitle && !matchesContent && !matchesSummary) return false;
      }

      // Date Filter
      if (filters.date) {
        const itemDate = new Date(item.isoDate).toISOString().split('T')[0];
        if (itemDate !== filters.date) return false;
      }

      if (filters.sources.length > 0 && !filters.sources.includes(item.source)) return false;

      const hasAnalysisFilters = filters.impactLevels.length > 0 || filters.sentiments.length > 0 || filters.sectors.length > 0;
      if (hasAnalysisFilters && !item.analysis) return false;

      if (item.analysis) {
        if (filters.impactLevels.length > 0 && !filters.impactLevels.includes(item.analysis.impact.level)) return false;
        if (filters.sentiments.length > 0 && !filters.sentiments.includes(item.analysis.impact.direction)) return false;
        if (filters.sectors.length > 0) {
            // Fix: Add optional chaining for sectors array here as well
            const hasSector = item.analysis.sectors?.some(s => filters.sectors.includes(s));
            if (!hasSector) return false;
        }
      }
      return true;
    });
  }, [news, filters, searchQuery]);

  // Reset visible news count when filters or search change
  useEffect(() => {
    setVisibleNewsCount(30);
  }, [filters, searchQuery]);

  const mostImpactfulNews = useMemo(() => {
    const analyzed = news.filter(n => n.analysis);
    const getScore = (n: AnalyzedNewsItem) => {
        if (!n.analysis) return 0;
        let base = 0;
        if (n.analysis.impact.level === ImpactLevel.HIGH) base = 300;
        else if (n.analysis.impact.level === ImpactLevel.MEDIUM) base = 200;
        else base = 100;
        return base + n.analysis.impact.confidence;
    };
    return [...analyzed].sort((a, b) => getScore(b) - getScore(a)).slice(0, 4);
  }, [news]);

  const autocompleteSuggestions = useMemo(() => {
    if (!newStockInput.trim()) return [];
    const search = newStockInput.toLowerCase();
    return MASTER_STOCK_LIST.filter(stock => 
      stock.toLowerCase().includes(search) && !watchlist.includes(stock)
    ).slice(0, 5);
  }, [newStockInput, watchlist]);

  // Watchlist news filter (uses raw news data + watchlist, not affected by main feed filters)
  const watchlistNews = useMemo(() => {
      const filtered = news.filter(n => {
        if (n.analysis?.watchlistRelevance?.isRelevant) return true;
        const textToCheck = (n.title + ' ' + n.contentSnippet).toLowerCase();
        
        return watchlist.some(stock => {
            // Handle "Name (SYMBOL)" format
            const match = stock.match(/^(.*?)\s*\((.*?)\)$/);
            if (match) {
                const name = match[1].toLowerCase();
                const symbol = match[2].toLowerCase();
                return textToCheck.includes(name) || textToCheck.includes(symbol);
            }
            // Fallback for simple strings
            return textToCheck.includes(stock.toLowerCase());
        });
      });
      // Explicitly sort by date descending to ensure latest news comes first
      return filtered.sort((a, b) => b.isoDate.getTime() - a.isoDate.getTime());
  }, [news, watchlist]);

  const activeFilterCount = filters.sources.length + filters.sectors.length + filters.impactLevels.length + filters.sentiments.length;

  return (
    <>
      {/* Interactive Grid Background — outside main container to avoid stacking context issues */}
      <InteractiveGridBackground />
      
    <div className="min-h-screen text-slate-100 pb-20">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 toast-glass text-slate-100 px-6 py-3 rounded-full flex items-center gap-2 animate-slideDownFade">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="sticky top-0 z-20 topbar-glass p-4">
        <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
            <div className="w-8 h-8 logo-gradient flex items-center justify-center shadow-lg shadow-teal-500/20">
                <IconSparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">FinIntel<span className="text-teal-400 font-light">India</span></h1>
            </div>
            <div className="flex items-center gap-3">
                 {user ? (
                     <button onClick={() => setActiveView('profile')} className="flex items-center justify-center mr-2 hover:opacity-80 transition-opacity">
                         <img src={customPhotoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=3b82f6&color=fff`} alt="Profile" className="w-8 h-8 rounded-full border-2 border-slate-700 object-cover" referrerPolicy="no-referrer" />
                     </button>
                 ) : (
                     <button onClick={handleLogin} className="text-xs bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 px-3 py-1.5 rounded-full font-medium transition-all mr-2 border border-teal-500/20 hover:border-teal-500/40">
                         Sign In
                     </button>
                 )}
                 <button 
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className={`relative p-2 rounded-lg transition-all ${showFilterPanel || activeFilterCount > 0 ? 'bg-teal-500/15 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                    <IconFilter className="w-5 h-5" />
                    {activeFilterCount > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-teal-500 rounded-full border border-background shadow-lg shadow-teal-500/40"></span>
                    )}
                 </button>
            </div>
        </div>
        {showFilterPanel && (
            <div className="mt-4">
                <FilterPanel 
                    filters={filters}
                    setFilters={setFilters}
                    availableSources={availableSources}
                    availableSectors={availableSectors}
                    onClose={() => setShowFilterPanel(false)}
                    resultCount={filteredNews.length}
                />
            </div>
        )}
      </div>

      {/* Main Content */}
      <main className="px-6 py-4 w-full">
        
        {loading && news.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 space-y-4">
             <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-slate-500 text-sm">Fetching markets data...</p>
          </div>
        ) : (
          <>
            {/* Using display:none for view switching to prevent remounting/flashing */}
            
            {/* FEED VIEW */}
            <div style={{ display: activeView === 'feed' ? 'block' : 'none' }} className="space-y-6 animate-entrance">
                 
                 {!showFilterPanel && <TodaysMoves />}

                 <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            Latest Headlines
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..." 
                                    className="w-28 focus:w-40 input-dark rounded-full pl-7 pr-6 py-1 text-[10px] text-slate-200 placeholder-slate-600 transition-all duration-300"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        <IconX className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <span className="text-[10px] text-teal-400/70 font-mono bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/15 min-w-[20px] text-center">
                                {filteredNews.length}
                            </span>
                        </div>
                    </div>
                    
                    {filteredNews.length === 0 && (
                        <div className="text-center py-12 border border-dashed border-slate-700/50 rounded-xl bg-slate-900/30">
                            <p className="text-slate-500">No articles match your filters.</p>
                            <button onClick={() => {
                                setFilters({sources:[], sectors:[], impactLevels:[], sentiments:[], date: null});
                                setSearchQuery('');
                            }} className="text-secondary text-sm mt-2 hover:underline">Clear Filters & Search</button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                        {filteredNews.slice(0, visibleNewsCount).map(item => (
                            <motion.div
                                key={item.id}
                                id={`news-${item.id}`}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                                className={item.analysis ? "md:col-span-2 lg:col-span-3" : ""}
                            >
                                <NewsCard 
                                    item={item} 
                                    onAnalyze={(id) => handleAnalyze(id, watchlist)} 
                                    onCollapse={handleCollapse}
                                />
                            </motion.div>
                        ))}
                        </AnimatePresence>
                    </div>

                    {filteredNews.length > 30 && (
                        <div className="flex flex-col items-center gap-3 mt-8 mb-4">
                            <span className="text-slate-500 text-sm">
                                Showing 30 of {filteredNews.length} articles
                            </span>
                            <button 
                                onClick={() => setVisibleNewsCount(prev => prev + 30)}
                                className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 px-6 py-2.5 rounded-full text-sm font-medium transition-all border border-teal-500/20 hover:border-teal-500/40"
                            >
                                Load More Articles
                            </button>
                        </div>
                    )}
                 </div>
            </div>

            {/* WATCHLIST VIEW */}
            <div style={{ display: activeView === 'watchlist' ? 'block' : 'none' }} className="animate-entrance">
                {!user ? (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-center">
                        <p className="font-medium">Please log in to see your watchlist and portfolio.</p>
                    </div>
                ) : (
                  <>
                    <PortfolioTracker 
                        portfolio={portfolio}
                        watchlist={watchlist}
                        onUpdatePortfolio={handleUpdatePortfolio}
                    />

                    <div className="mb-6 card-glass-static p-4">
                      <h2 className="text-lg font-semibold mb-4">My Watchlist</h2>
                      
                      <div className="relative mb-4">
                          <form onSubmit={(e) => handleAddToWatchlist(e)} className="flex gap-2">
                            <input 
                              type="text" 
                              value={newStockInput}
                              onChange={(e) => setNewStockInput(e.target.value)}
                              placeholder="e.g. RELIANCE, TCS" 
                              className="flex-1 input-dark px-4 py-2 text-sm text-white placeholder-slate-500"
                            />
                            <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white p-2 rounded-lg transition-all shadow-lg shadow-teal-500/20">
                              <IconPlus />
                            </button>
                          </form>

                          {autocompleteSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 card-elevated z-30 max-h-48 overflow-y-auto">
                                  {autocompleteSuggestions.map((suggestion) => (
                                      <button
                                          key={suggestion}
                                          onClick={() => handleAddToWatchlist(undefined, suggestion)}
                                          className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-teal-500/10 hover:text-white border-b border-slate-700/30 last:border-0 transition-colors"
                                      >
                                          {suggestion}
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 stagger-children">
                        {watchlist.length === 0 && <span className="text-slate-500 text-sm italic col-span-full">No assets added yet.</span>}
                        {watchlist.map(stock => (
                          <div 
                            key={stock} 
                            onClick={() => {
                              setSelectedAsset(stock);
                              setActiveView('assetDetail');
                            }}
                            className="flex items-center justify-between card-glass p-4 cursor-pointer group"
                          >
                            <span className="font-medium text-slate-200 truncate pr-2">{stock}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromWatchlist(stock);
                              }} 
                              className="text-slate-500 hover:text-red-400 p-2 -mr-2 rounded-full hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                            >
                               <IconTrash className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {watchlist.length < 3 && newStockInput.length === 0 && (
                         <div className="mt-6 pt-4 border-t border-slate-700/50">
                            <p className="text-xs text-slate-500 mb-3">Popular Picks:</p>
                            <div className="flex flex-wrap gap-2">
                               {STOCK_SUGGESTIONS.slice(0, 8).filter(s => !watchlist.includes(s.toUpperCase())).map(s => (
                                  <button 
                                    key={s} 
                                    onClick={() => {
                                       const updated = addToWatchlist(s.toUpperCase());
                                       setWatchlist(updated);
                                    }}
                                    className="text-xs bg-teal-500/8 text-slate-400 border border-teal-500/15 px-3 py-1.5 rounded-full hover:border-teal-500/30 hover:text-teal-400 transition-all"
                                  >
                                    + {s}
                                  </button>
                               ))}
                            </div>
                         </div>
                      )}
                    </div>
                  </>
                )}
            </div>

            {/* ASSET DETAIL VIEW */}
            {activeView === 'assetDetail' && selectedAsset && (
              <motion.div
                key="assetDetail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AssetDetail 
                  assetName={selectedAsset} 
                  news={news} 
                  onBack={() => {
                    setActiveView('watchlist');
                    setSelectedAsset(null);
                  }}
                  onAnalyze={handleAnalyze}
                  onCollapse={handleCollapse}
                />
              </motion.div>
            )}
          </>
        )}

        {/* Profile View */}
        {activeView === 'profile' && (
            <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
            >
                <Profile 
                  user={user} 
                  customPhotoURL={customPhotoURL}
                  onLogout={handleLogout} 
                  onLogin={handleLogin}
                  onPhotoUpdated={handlePhotoUpdated}
                />
            </motion.div>
        )}

        {/* Budget View */}
        {activeView === 'budget' && (
            <motion.div
                key="budget"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
            >
                {!user ? (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-center">
                        <p className="font-medium">Please log in to see your budget and expenses.</p>
                    </div>
                ) : (
                    <BudgetTracker 
                      budgetData={budgetData}
                      onUpdateBudget={handleUpdateBudget}
                    />
                )}
            </motion.div>
        )}

        {/* Tools View */}
        {activeView === 'tools' && (
            <motion.div
                key="tools"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
            >
                <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-700/30">
                    <button
                        onClick={() => setActiveTool('sip')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTool === 'sip' ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        SIP Calculator
                    </button>
                    <button
                        onClick={() => setActiveTool('goals')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTool === 'goals' ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Goal Tracker
                    </button>
                </div>

                {activeTool === 'sip' ? (
                    <SIPVisualizer />
                ) : (
                    !user ? (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-center">
                            <p className="font-medium">Please log in to track your financial goals.</p>
                        </div>
                    ) : (
                        <GoalTracker 
                            goals={goals}
                            onUpdateGoals={handleUpdateGoals}
                        />
                    )
                )}
            </motion.div>
        )}
      </main>

      {/* Floating Action Button for Refresh */}
      <button 
        onClick={handleManualRefresh}
        className="fixed bottom-24 right-4 z-40 fab-primary text-white p-2.5 rounded-full active:scale-95 opacity-60 hover:opacity-100"
        aria-label="Refresh News"
      >
        <IconRefresh className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>

      {/* Floating Action Button for Bot */}
      <button 
        onClick={() => setIsBotOpen(true)}
        className="fixed bottom-36 right-4 z-40 fab-glass text-white p-2.5 rounded-full active:scale-95 opacity-80 hover:opacity-100 flex items-center justify-center"
        aria-label="Open Financial Bot"
      >
        <IconBot className="w-5 h-5 text-teal-400" />
      </button>

      <FinancialBot 
        isOpen={isBotOpen} 
        onClose={() => setIsBotOpen(false)} 
        budgetData={budgetData} 
      />

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full bottomnav-glass pb-safe z-40">
        <div className="flex justify-around items-center p-2">
          <button 
            onClick={() => setActiveView('feed')}
            className={`flex flex-col items-center p-2 rounded-lg w-16 transition-all ${activeView === 'feed' ? 'text-teal-400 nav-item-active' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <IconHome className={activeView === 'feed' ? 'stroke-[2.5px]' : ''} />
            <span className="text-[10px] mt-1 font-medium">Feed</span>
          </button>
          
          <button 
            onClick={() => setActiveView('watchlist')}
            className={`flex flex-col items-center p-2 rounded-lg w-16 transition-all ${activeView === 'watchlist' || activeView === 'assetDetail' ? 'text-teal-400 nav-item-active' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <IconList className={activeView === 'watchlist' || activeView === 'assetDetail' ? 'stroke-[2.5px]' : ''} />
            <span className="text-[10px] mt-1 font-medium">Watchlist</span>
          </button>

          <button 
            onClick={() => setActiveView('budget')}
            className={`flex flex-col items-center p-2 rounded-lg w-16 transition-all ${activeView === 'budget' ? 'text-teal-400 nav-item-active' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <IconWallet className={activeView === 'budget' ? 'stroke-[2.5px]' : ''} />
            <span className="text-[10px] mt-1 font-medium">Budget</span>
          </button>

          <button 
            onClick={() => setActiveView('tools')}
            className={`flex flex-col items-center p-2 rounded-lg w-16 transition-all ${activeView === 'tools' ? 'text-teal-400 nav-item-active' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <IconCalculator className={activeView === 'tools' ? 'stroke-[2.5px]' : ''} />
            <span className="text-[10px] mt-1 font-medium">Tools</span>
          </button>

          <button 
            onClick={() => setActiveView('profile')}
            className={`flex flex-col items-center p-2 rounded-lg w-16 transition-all ${activeView === 'profile' ? 'text-teal-400 nav-item-active' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <IconUser className={activeView === 'profile' ? 'stroke-[2.5px]' : ''} />
            <span className="text-[10px] mt-1 font-medium">Profile</span>
          </button>
        </div>
      </nav>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes slideDownFade { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-slideDownFade { animation: slideDownFade 0.3s ease-out forwards; }
      `}</style>
    </div>
    </>
  );
};

export default App;
