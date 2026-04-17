import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis, ImpactDirection, ImpactLevel, BudgetData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const categorizeExpense = async (
  expenseText: string,
  existingCategories: string[]
): Promise<{ amount: number; category: string }> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this user expense input: "${expenseText}"
    
    Tasks:
    1. Extract the exact numerical amount spent.
    2. Categorize the expense into a short, 1-2 word category (e.g., "Food", "Transport", "Entertainment", "Shopping", "Utilities").
    3. If the expense clearly fits into one of these existing categories, use it: ${JSON.stringify(existingCategories)}. Otherwise, create a new logical category.
    
    Return JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "The amount spent" },
            category: { type: Type.STRING, description: "The category name" }
          },
          required: ["amount", "category"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as { amount: number; category: string };
    }
    throw new Error("No text response from AI");
  } catch (error) {
    console.error("Gemini Expense Categorization Error:", error);
    throw error;
  }
};

export const roastPortfolio = async (portfolio: PortfolioItem[]): Promise<string> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are a savage, GenZ financial advisor. Look at this stock market portfolio:
    ${JSON.stringify(portfolio, null, 2)}
    
    Roast it. Be funny, use GenZ slang (like '💀', 'make it make sense', 'down bad', 'cooked', 'W', 'L', 'diamond hands', 'paper hands'), but keep it lighthearted and not actually mean.
    If the portfolio is empty, roast them for being broke or scared of the market.
    Keep it to 2-3 short, punchy paragraphs.
    
    Return ONLY the text of the roast. No JSON, no markdown formatting blocks.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    if (response.text) {
      return response.text;
    }
    throw new Error("No text response from AI");
  } catch (error) {
    console.error("Gemini Portfolio Roast Error:", error);
    throw error;
  }
};

export const analyzeArticle = async (
  title: string,
  snippet: string, 
  userWatchlist: string[]
): Promise<AIAnalysis> => {
  
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this financial news article for the Indian Stock Market context.
    
    Article Title: "${title}"
    Snippet: "${snippet}"
    User Watchlist: ${JSON.stringify(userWatchlist)}

    Tasks:
    1. Summarize the news in 3-4 bullet lines (TL;DR).
    2. Explain "Why this matters" in 1-2 lines.
    3. Identify 3-4 relevant Indian business sectors.
    4. Identify potentially affected Indian stock tickers/company names (NSE/BSE).
    5. Determine market sentiment (Bullish/Bearish/Neutral) and impact level.
    6. Check if it affects any stock in the User Watchlist.
    7. **Ripple Effect (Second-Order Thinking):** Map the chain reaction. Event -> Intermediate Consequence -> Final Stock Impact.
    8. **B.S. Detector (Credibility):** Rate reliability 0-100 based on source authority and language (Fact vs Opinion).
    9. **Detailed Briefing:** Write a comprehensive, professional 2-paragraph briefing of this news event suitable for an investor.
    10. **ELI5 / GenZ Translation:** Explain this news like you're explaining it to a GenZ teenager using slang (e.g., 'W', 'L', 'cooked', 'no cap', 'fr'). Keep it to 1-2 sentences.

    Return JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            detailedSummary: { type: Type.STRING, description: "A detailed 2-paragraph investor briefing" },
            eli5: { type: Type.STRING, description: "GenZ / ELI5 translation of the news" },
            whyItMatters: { type: Type.STRING },
            sectors: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            relatedStocks: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            impact: {
              type: Type.OBJECT,
              properties: {
                direction: { type: Type.STRING, enum: [ImpactDirection.BULLISH, ImpactDirection.BEARISH, ImpactDirection.NEUTRAL] },
                level: { type: Type.STRING, enum: [ImpactLevel.LOW, ImpactLevel.MEDIUM, ImpactLevel.HIGH] },
                confidence: { type: Type.NUMBER }
              }
            },
            watchlistRelevance: {
              type: Type.OBJECT,
              properties: {
                isRelevant: { type: Type.BOOLEAN },
                reason: { type: Type.STRING }
              }
            },
            rippleEffect: {
              type: Type.OBJECT,
              properties: {
                trigger: { type: Type.STRING, description: "The immediate news event" },
                intermediate: { type: Type.STRING, description: "The downstream economic/sector effect" },
                finalImpact: { type: Type.STRING, description: "The resulting impact on specific companies" }
              }
            },
            credibility: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER, description: "0-100 score" },
                verdict: { type: Type.STRING, enum: ['Verified Fact', 'Likely True', 'Speculative', 'Rumor/Opinion'] },
                reason: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysis;
    }
    throw new Error("No text response from AI");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const chatWithFinancialBot = async (
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  message: string,
  budgetData: BudgetData
): Promise<string> => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are an expert Indian Financial Advisor and Budgeting Assistant.
    Your goal is to help the user with guiding, budgeting, and smart investing.
    
    Context about the user's current budget:
    - Monthly Revenue: ₹${budgetData.revenue.toLocaleString('en-IN')}
    - Total Spent: ₹${budgetData.categories.reduce((acc, cat) => acc + cat.amount, 0).toLocaleString('en-IN')}
    - Expenses Breakdown: ${budgetData.categories.map(c => `${c.name} (₹${c.amount})`).join(', ')}
    
    CRITICAL GUIDELINES:
    1. KEEP ANSWERS SHORT, CRISP, AND UNDERSTANDABLE. Do not give lengthy, rambling responses. Get straight to the point.
    2. FORMATTING IS KEY:
       - Use Markdown tables for comparisons, pros/cons, or data breakdowns.
       - Use generous spacing between paragraphs.
       - Use **bolding** to highlight key terms or numbers.
       - Use bullet points for lists.
    3. Provide actionable advice tailored to the Indian Market.
    4. When suggesting investments, rank options from least risky to most risky (e.g., FDs/RDs -> Debt Funds/Bonds -> Index Funds/Large Cap MFs -> Mid/Small Cap Stocks -> Crypto/F&O).
    5. ALWAYS end your response by asking: "Would you like to understand more about this?" or "Do you need more details?"
  `;

  try {
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    // We need to manually send the history if we want to maintain the conversation state
    // The new SDK handles history differently, but for simplicity we can just send the whole context
    // as a single prompt if history management is complex, or use the chat session.
    
    // For the new SDK, we can pass history in the create method:
    const chatSession = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
      },
      history: history
    });

    const response = await chatSession.sendMessage({ message });
    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};
