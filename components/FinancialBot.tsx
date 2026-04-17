import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconX, IconSend, IconBot, IconUser } from './Icons';
import { chatWithFinancialBot } from '../services/geminiService';
import { BudgetData } from '../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FinancialBotProps {
  isOpen: boolean;
  onClose: () => void;
  budgetData: BudgetData;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const FinancialBot: React.FC<FinancialBotProps> = ({ isOpen, onClose, budgetData }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi! I'm your FinIntel AI Advisor. I can help you analyze your budget, suggest ways to save, or recommend investment options in the Indian market ranging from low to high risk. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Format history for Gemini SDK
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await chatWithFinancialBot(history, userMsg.text, budgetData);
      
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: "Sorry, I encountered an error. Please try again." };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-24 right-4 w-[90vw] max-w-md h-[60vh] max-h-[600px] card-elevated z-50 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-slate-900/60 p-4 border-b border-slate-700/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-teal-600 p-1.5 rounded-lg shadow-lg shadow-teal-500/30">
                <IconBot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">FinIntel Advisor</h3>
                <p className="text-xs text-slate-400">AI Budget & Investment Guide</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
              <IconX className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 ${
                  msg.role === 'user' 
                    ? 'bg-teal-600 text-white rounded-tr-sm' 
                    : 'bg-slate-800/60 border border-slate-700/30 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.role === 'model' ? (
                    <div className="markdown-body text-sm prose prose-invert max-w-none prose-p:leading-relaxed prose-p:mb-3 prose-li:my-1 prose-table:w-full prose-table:my-3 prose-th:text-left prose-th:p-2 prose-th:border-b prose-th:border-slate-600 prose-td:p-2 prose-td:border-b prose-td:border-slate-700/50">
                      <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/60 border border-slate-700/30 rounded-2xl rounded-tl-sm p-4 flex gap-1">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-900/60 border-t border-slate-700/30">
            <div className="flex items-center gap-2 input-dark rounded-full px-4 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about budgeting or investing..."
                className="flex-1 bg-transparent text-sm text-white focus:outline-none"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="text-teal-400 disabled:text-slate-600 p-1 transition-all hover:text-teal-300"
              >
                <IconSend className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FinancialBot;
