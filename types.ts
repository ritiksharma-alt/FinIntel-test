export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  contentSnippet: string;
  isoDate: Date;
}

export enum ImpactDirection {
  BULLISH = 'Bullish',
  BEARISH = 'Bearish',
  NEUTRAL = 'Neutral',
}

export enum ImpactLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

export interface RippleEffect {
  trigger: string; // The main event (e.g., Crude Oil up)
  intermediate: string; // The domino effect (e.g., Paint raw material costs up)
  finalImpact: string; // The stock impact (e.g., Asian Paints Margins down)
}

export interface Credibility {
  score: number; // 0 to 100
  verdict: 'Verified Fact' | 'Likely True' | 'Speculative' | 'Rumor/Opinion';
  reason: string;
}

export interface AIAnalysis {
  summary: string; // TL;DR
  detailedSummary: string; // Comprehensive briefing
  eli5: string; // GenZ / ELI5 translation
  whyItMatters: string;
  sectors: string[];
  relatedStocks: string[]; // List of Tickers/Names
  impact: {
    direction: ImpactDirection;
    level: ImpactLevel;
    confidence: number;
  };
  watchlistRelevance?: {
    isRelevant: boolean;
    reason: string;
  };
  rippleEffect: RippleEffect;
  credibility: Credibility;
}

export interface AnalyzedNewsItem extends NewsItem {
  analysis?: AIAnalysis;
  isAnalyzing: boolean;
  analysisError?: boolean;
}

export type ViewState = 'feed' | 'watchlist' | 'settings' | 'profile' | 'assetDetail' | 'budget' | 'tools';

export interface FilterState {
  sources: string[];
  sectors: string[];
  impactLevels: ImpactLevel[];
  sentiments: ImpactDirection[];
  date: string | null;
}

export type AssetType = 'Stock' | 'ETF';

export interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  averagePrice: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  amount: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  color: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  date: string;
}

export interface BudgetData {
  revenue: number;
  categories: BudgetCategory[];
  transactions?: Transaction[];
}
