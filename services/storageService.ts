import { AnalyzedNewsItem, BudgetData, PortfolioItem, Goal } from '../types';

const WATCHLIST_KEY = 'finintel_watchlist_v1';
const PORTFOLIO_KEY = 'finintel_portfolio_v1';
const NEWS_CACHE_KEY = 'finintel_news_cache_v3'; // Incremented to v3 for Detailed Briefing
const BUDGET_KEY = 'finintel_budget_v1';
const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

// --- Portfolio ---

export const getLocalPortfolio = (): PortfolioItem[] => {
  try {
    const stored = localStorage.getItem(PORTFOLIO_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const setLocalPortfolio = (portfolio: PortfolioItem[]) => {
  try {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
  } catch (e) {
    console.error('Error saving portfolio to local storage', e);
  }
};

// --- Goals ---
const GOALS_KEY = 'finintel_goals';

export const getLocalGoals = (): Goal[] => {
  try {
    const stored = localStorage.getItem(GOALS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load goals from local storage", error);
    return [];
  }
};

export const setLocalGoals = (goals: Goal[]) => {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error("Failed to save goals to local storage", error);
  }
};

// --- Budget ---

export const getLocalBudget = (): BudgetData | null => {
  try {
    const stored = localStorage.getItem(BUDGET_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

export const setLocalBudget = (budget: BudgetData) => {
  try {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budget));
  } catch (e) {
    console.error('Error saving budget to local storage', e);
  }
};

// --- Watchlist ---

export const getWatchlist = (): string[] => {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      // Filter out mutual funds (symbols starting with 0P)
      return parsed.filter(symbol => !symbol.includes('0P'));
    }
    return [];
  } catch (e) {
    return [];
  }
};

export const addToWatchlist = (stock: string): string[] => {
  const current = getWatchlist();
  if (!current.includes(stock)) {
    const updated = [...current, stock];
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
    return updated;
  }
  return current;
};

export const removeFromWatchlist = (stock: string): string[] => {
  const current = getWatchlist();
  const updated = current.filter(s => s !== stock);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  return updated;
};

export const setWatchlistInStorage = (watchlist: string[]) => {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  } catch (e) {
    console.error('Error saving watchlist to local storage', e);
  }
};

// --- News Cache ---

export const getNewsCache = (): AnalyzedNewsItem[] => {
  try {
    const stored = localStorage.getItem(NEWS_CACHE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    const now = new Date().getTime();
    
    // Filter out items older than 6 days and re-hydrate Date objects
    return parsed
      .map((n: any) => ({
        ...n,
        isoDate: new Date(n.pubDate) // Reconstruct Date object from string
      }))
      .filter((n: AnalyzedNewsItem) => (now - n.isoDate.getTime()) < SIX_DAYS_MS);
  } catch (e) {
    console.error("Error reading news cache", e);
    return [];
  }
};

export const saveNewsCache = (news: AnalyzedNewsItem[]) => {
  try {
    const now = new Date().getTime();
    // Double check expiration before saving to keep storage clean
    const validNews = news.filter(item => {
      const itemTime = new Date(item.pubDate).getTime();
      return (now - itemTime) < SIX_DAYS_MS;
    });
    
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(validNews));
  } catch (e) {
    console.error("Error saving news cache (likely full)", e);
  }
};
