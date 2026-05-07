import React, { useState, useMemo } from 'react';
import { AppData, ExpenseEntry } from '../types';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Calendar, Search, DollarSign, Tag, Settings2, X, Edit2, Check, ChevronDown, ChevronRight, Coins } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';

interface ExpenseTrackerProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
  onUpdateExpense?: (expense: ExpenseEntry, isDelete?: boolean) => void;
}

const DEFAULT_CATEGORIES = ['Rice', 'Noodle', 'Water', 'Gasoline', 'Coffee', 'Tea', 'Clothes', 'Milk Shake', 'Food', 'Others'];
const EXCHANGE_RATE = 4000; // 1 USD = 4000 KHR

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ data, onUpdate, onUpdateExpense }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'KHR'>(data.settings?.currency || 'USD');
  const [showCategorySummary, setShowCategorySummary] = useState(true);

  const categories = data.expenseCategories || DEFAULT_CATEGORIES;
  const expenses = data.expenses || [];
  
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: categories[0] || 'Others',
    type: 'Expense' as 'Income' | 'Expense',
    currency: currencyMode
  });
  
  const [smartInput, setSmartInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<{index: number, value: string} | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});

  const filteredByView = useMemo(() => {
    const start = (() => {
      switch (viewMode) {
        case 'Daily': return startOfDay(selectedDate);
        case 'Weekly': return startOfWeek(selectedDate);
        case 'Monthly': return startOfMonth(selectedDate);
        case 'Yearly': return startOfYear(selectedDate);
        default: return startOfMonth(selectedDate);
      }
    })();

    const end = (() => {
      switch (viewMode) {
        case 'Daily': return endOfDay(selectedDate);
        case 'Weekly': return endOfWeek(selectedDate);
        case 'Monthly': return endOfMonth(selectedDate);
        case 'Yearly': return endOfYear(selectedDate);
        default: return endOfMonth(selectedDate);
      }
    })();

    return expenses.filter(e => {
      const d = new Date(e.date);
      // Ensure we compare local dates correctly
      return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
    });
  }, [expenses, viewMode, selectedDate]);

  const formatCurrency = (amount: number, currency?: 'USD' | 'KHR', forceSymbol?: boolean) => {
    const targetCurrency = currencyMode;
    let finalAmount = amount;

    if (currency === 'KHR' && targetCurrency === 'USD') finalAmount = amount / EXCHANGE_RATE;
    if (currency === 'USD' && targetCurrency === 'KHR') finalAmount = amount * EXCHANGE_RATE;
    
    if (targetCurrency === 'KHR') {
      return `${finalAmount.toLocaleString()} R`;
    }
    return `$${finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalIncome = filteredByView.filter(e => e.type === 'Income').reduce((sum, e) => {
    let amt = e.amount;
    if (e.currency === 'KHR' && currencyMode === 'USD') amt /= EXCHANGE_RATE;
    if (e.currency === 'USD' && currencyMode === 'KHR') amt *= EXCHANGE_RATE;
    return sum + amt;
  }, 0);

  const totalExpense = filteredByView.filter(e => e.type === 'Expense').reduce((sum, e) => {
    let amt = e.amount;
    if (e.currency === 'KHR' && currencyMode === 'USD') amt /= EXCHANGE_RATE;
    if (e.currency === 'USD' && currencyMode === 'KHR') amt *= EXCHANGE_RATE;
    return sum + amt;
  }, 0);

  const balance = totalIncome - totalExpense;

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;

    const expense: ExpenseEntry = {
      id: uuidv4(),
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      category: newExpense.type === 'Income' ? 'Income' : newExpense.category,
      type: newExpense.type,
      currency: newExpense.currency,
      date: selectedDate.toISOString()
    };

    if (onUpdateExpense) {
      onUpdateExpense(expense);
    } else {
      onUpdate({
        ...data,
        expenses: [expense, ...expenses]
      });
    }

    setNewExpense({
      description: '',
      amount: '',
      category: categories[0] || 'Others',
      type: 'Expense',
      currency: currencyMode
    });
    setIsAdding(false);
  };

  const parseEntry = (input: string) => {
    let currency: 'USD' | 'KHR' = currencyMode;
    let valStr = input;

    // Smart detection
    if (input.startsWith('$')) {
      currency = 'USD';
      valStr = input.substring(1);
    } else if (input.toUpperCase().endsWith('$')) {
      currency = 'USD';
      valStr = input.substring(0, input.length - 1);
    } else if (input.toUpperCase().endsWith('USD')) {
      currency = 'USD';
      valStr = input.substring(0, input.length - 3);
    } else if (input.toUpperCase().endsWith('RIELS') || input.toUpperCase().endsWith('RIEL')) {
      currency = 'KHR';
      valStr = input.toUpperCase().endsWith('RIELS') ? input.substring(0, input.length - 5) : input.substring(0, input.length - 4);
    } else if (input.toUpperCase().endsWith('R') || input.toUpperCase().endsWith('KHR')) {
      currency = 'KHR';
      valStr = input.toUpperCase().endsWith('KHR') ? input.substring(0, input.length - 3) : input.substring(0, input.length - 1);
    }

    const amount = parseFloat(valStr.replace(/,/g, '').replace(/\s/g, ''));
    return { amount, currency };
  };

  const handleInlineAdd = (category: string) => {
    const input = inlineInputs[category]?.trim();
    if (!input) return;

    const { amount, currency } = parseEntry(input);
    if (isNaN(amount) || amount <= 0) return;

    const expense: ExpenseEntry = {
      id: uuidv4(),
      description: category,
      amount: amount,
      category: category,
      type: 'Expense',
      currency: currency,
      date: selectedDate.toISOString()
    };

    if (onUpdateExpense) {
      onUpdateExpense(expense);
    } else {
      onUpdate({
        ...data,
        expenses: [expense, ...expenses]
      });
    }

    setInlineInputs({ ...inlineInputs, [category]: '' });
  };

  const getCombinedTotal = (items: ExpenseEntry[]) => {
    let usdTotal = 0;
    let khrTotal = 0;

    items.forEach(e => {
      if (e.type === 'Expense') {
        if (e.currency === 'KHR') khrTotal += e.amount;
        else usdTotal += e.amount;
      }
    });

    const totalInCurrentMode = currencyMode === 'USD' 
      ? usdTotal + (khrTotal / EXCHANGE_RATE)
      : khrTotal + (usdTotal * EXCHANGE_RATE);

    return { usd: usdTotal, khr: khrTotal, total: totalInCurrentMode };
  };

  const totals = getCombinedTotal(filteredByView);

  const handleDeleteExpense = (id: string) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    if (onUpdateExpense && expenseToDelete) {
      onUpdateExpense(expenseToDelete, true);
    } else {
      onUpdate({
        ...data,
        expenses: expenses.filter(e => e.id !== id)
      });
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCats = [...categories, newCategoryName.trim()];
    onUpdate({
      ...data,
      expenseCategories: newCats
    });
    setNewCategoryName('');
  };

  const handleRenameCategory = () => {
    if (!editingCategory || !editingCategory.value.trim()) return;
    const newCats = [...categories];
    newCats[editingCategory.index] = editingCategory.value.trim();
    onUpdate({
      ...data,
      expenseCategories: newCats
    });
    setEditingCategory(null);
  };

  const handleDeleteCategory = (idx: number) => {
    const newCats = categories.filter((_, i) => i !== idx);
    onUpdate({
      ...data,
      expenseCategories: newCats
    });
  };

  const handleSmartAdd = () => {
    const input = smartInput.trim();
    if (!input) return;

    let foundCategory = categories.find(c => c.toLowerCase() === 'others') || categories[0] || 'Others';
    let amountStr = '';

    const parts = input.split(' ');
    if (parts.length >= 2) {
      const firstPart = parts[0].toLowerCase();
      const match = categories.find(c => c.toLowerCase() === firstPart);
      if (match) {
        foundCategory = match;
        amountStr = parts.slice(1).join('').trim();
      } else {
        const lastPart = parts[parts.length - 1].toLowerCase();
        const possibleAmount = parseEntry(lastPart);
        if (!isNaN(possibleAmount.amount)) {
          amountStr = lastPart;
          foundCategory = parts.slice(0, parts.length - 1).join(' ').trim();
          const matchExisting = categories.find(c => c.toLowerCase() === foundCategory.toLowerCase());
          if (matchExisting) foundCategory = matchExisting;
        }
      }
    }

    if (!amountStr) {
        amountStr = input;
    }

    const { amount, currency } = parseEntry(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    const expense: ExpenseEntry = {
      id: uuidv4(),
      description: foundCategory,
      amount: amount,
      category: foundCategory,
      type: 'Expense',
      currency: currency,
      date: selectedDate.toISOString()
    };

    if (onUpdateExpense) {
      onUpdateExpense(expense);
    } else {
      onUpdate({
        ...data,
        expenses: [expense, ...expenses]
      });
    }

    setSmartInput('');
  };

  const categorySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    categories.forEach(cat => summary[cat] = 0);
    
    filteredByView.filter(e => e.type === 'Expense').forEach(e => {
      let amt = e.amount;
      if (e.currency === 'KHR' && currencyMode === 'USD') amt /= EXCHANGE_RATE;
      if (e.currency === 'USD' && currencyMode === 'KHR') amt *= EXCHANGE_RATE;
      
      const match = categories.find(c => c.toLowerCase() === e.category.toLowerCase());
      if (match) {
        summary[match] = (summary[match] || 0) + amt;
      } else {
        const others = categories.find(c => c.toLowerCase() === 'others') || categories[0];
        if (others) summary[others] = (summary[others] || 0) + amt;
      }
    });
    
    return summary;
  }, [filteredByView, categories, currencyMode]);

  const toggleCurrency = () => {
    const next = currencyMode === 'USD' ? 'KHR' : 'USD';
    setCurrencyMode(next);
    onUpdate({
      ...data,
      settings: { ...data.settings, currency: next }
    });
  };

  const filteredExpenses = useMemo(() => {
    let filtered = filteredByView.filter(e => 
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (viewMode === 'Daily') return filtered;

    const aggregated: Record<string, ExpenseEntry & { count?: number }> = {};
    filtered.forEach(e => {
        const key = `${e.category}-${e.type}-${e.currency}-aggregated`;
        if (!aggregated[key]) {
            aggregated[key] = { ...e, description: `${e.category} (Total)`, id: key };
            (aggregated[key] as any).count = 1;
        } else {
            aggregated[key].amount += e.amount;
            (aggregated[key] as any).count = ((aggregated[key] as any).count || 1) + 1;
        }
    });

    return Object.values(aggregated).sort((a, b) => {
        let amtA = a.amount; if(a.currency !== currencyMode) amtA = a.currency === 'USD' ? amtA * EXCHANGE_RATE : amtA / EXCHANGE_RATE;
        let amtB = b.amount; if(b.currency !== currencyMode) amtB = b.currency === 'USD' ? amtB * EXCHANGE_RATE : amtB / EXCHANGE_RATE;
        return amtB - amtA;
    });
  }, [filteredByView, searchTerm, viewMode, currencyMode]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white/[0.005] backdrop-blur-3xl p-3 md:p-6 overflow-y-auto md:overflow-hidden font-sans">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3 drop-shadow-sm">
            <Wallet className="text-amber-600" /> Daily Expenses
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="flex bg-white/5 backdrop-blur-3xl rounded-2xl p-1.5 border border-white/10 shadow-sm">
              {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-900/40 hover:text-slate-900'}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-3xl rounded-2xl p-2 border border-white/20 shadow-lg px-6">
               <button onClick={() => setSelectedDate(d => {
                 const newD = new Date(d);
                 if (viewMode === 'Daily') newD.setDate(d.getDate() - 1);
                 else if (viewMode === 'Weekly') newD.setDate(d.getDate() - 7);
                 else if (viewMode === 'Monthly') newD.setMonth(d.getMonth() - 1);
                 else newD.setFullYear(d.getFullYear() - 1);
                 return newD;
               })} className="p-2 bg-white/40 hover:bg-white rounded-lg transition-all"><ChevronDown className="rotate-90" size={16} /></button>
               
               <div className="flex flex-col items-center">
                 <span className="text-[11px] font-black italic text-slate-900 tracking-widest whitespace-nowrap">
                   {viewMode === 'Daily' && format(selectedDate, 'MMM dd, yyyy')}
                   {viewMode === 'Weekly' && `Week of ${format(startOfWeek(selectedDate), 'MMM dd')}`}
                   {viewMode === 'Monthly' && format(selectedDate, 'MMMM yyyy')}
                   {viewMode === 'Yearly' && format(selectedDate, 'yyyy')}
                 </span>
                 <span className="text-[8px] font-bold text-amber-500/60 uppercase tracking-tighter">Active Date</span>
               </div>

               <button onClick={() => setSelectedDate(d => {
                 const newD = new Date(d);
                 if (viewMode === 'Daily') newD.setDate(d.getDate() + 1);
                 else if (viewMode === 'Weekly') newD.setDate(d.getDate() + 7);
                 else if (viewMode === 'Monthly') newD.setMonth(d.getMonth() + 1);
                 else newD.setFullYear(d.getFullYear() + 1);
                 return newD;
               })} className="p-2 bg-white/40 hover:bg-white rounded-lg transition-all"><ChevronDown className="-rotate-90" size={16} /></button>
            </div>

            <button 
              onClick={toggleCurrency}
              className="flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-3xl rounded-xl border border-white/10 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-900 overflow-hidden group"
            >
              <Coins size={14} className="text-amber-600 group-hover:rotate-12 transition-transform" />
              {currencyMode}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setIsManagingCategories(true)}
            className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-900/60 hover:text-slate-900 transition-all border border-white/10"
            title="Manage Categories"
          >
            <Settings2 size={20} />
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-amber-500 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
          >
            <Plus size={18} className="inline mr-2" /> Add Record
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div whileHover={{ y: -2 }} className="bg-white/[0.005] backdrop-blur-3xl border border-white/10 rounded-[32px] p-5 shadow-sm relative overflow-hidden">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900/30 mb-1">Net Balance</p>
             <h2 className={`text-3xl font-black italic tracking-tighter ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {formatCurrency(balance)}
             </h2>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="bg-emerald-500/[0.01] backdrop-blur-3xl border border-emerald-500/10 rounded-[32px] p-5 shadow-sm">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/40 mb-1">{viewMode} Income</p>
             <h2 className="text-2xl font-black italic tracking-tighter text-emerald-600">
                +{formatCurrency(totalIncome)}
             </h2>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="bg-rose-500/[0.01] backdrop-blur-3xl border border-rose-500/10 rounded-[32px] p-5 shadow-sm">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600/40 mb-1">{viewMode} Expense</p>
             <h2 className="text-2xl font-black italic tracking-tighter text-rose-600">
                -{formatCurrency(totalExpense)}
             </h2>
             {totals.usd > 0 && totals.khr > 0 && (
               <p className="text-[9px] font-black italic text-rose-600/60 mt-1 uppercase tracking-tight">
                 ${totals.usd.toLocaleString()} + {totals.khr.toLocaleString()} Riels
               </p>
             )}
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="bg-amber-500/[0.01] backdrop-blur-3xl border border-amber-500/10 rounded-[32px] p-5 shadow-sm flex flex-col justify-center">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/40 mb-1">Exchange Rate</p>
             <p className="text-xs font-black italic text-slate-900">1 USD = 4,000 Riels</p>
        </motion.div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8 overflow-visible md:overflow-hidden">
        {/* Structured Category List */}
        <div className="w-full md:w-[350px] lg:w-[450px] xl:w-[550px] bg-white/[0.005] backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-sm flex flex-col overflow-hidden text-left shrink-0">
            <div className="p-4 border-b border-white/10 flex flex-col gap-3 bg-amber-500/5">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Category Summary</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-rose-500 uppercase px-2 py-1 bg-rose-500/10 rounded-lg">Instant Sync</span>
                        <button onClick={() => setShowCategorySummary(!showCategorySummary)} className="text-slate-900/20 hover:text-amber-600 transition-colors">
                            <ChevronDown className={`transition-transform duration-300 ${showCategorySummary ? "" : "-rotate-90"}`} size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-900/30 uppercase tracking-widest italic">
                    Press Enter to save to {format(selectedDate, 'MMM dd')}
                  </p>
                  <button onClick={() => setIsManagingCategories(true)} className="text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 bg-amber-500/10 px-3 py-1.5 rounded-lg transition-colors">
                    Edit Items
                  </button>
                </div>
            </div>
            
            <AnimatePresence>
                {showCategorySummary && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex-1 overflow-y-auto custom-scrollbar-amber p-6"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
                            {categories.map(cat => (
                                <div key={cat} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl group hover:bg-slate-50 transition-all shadow-sm focus-within:ring-2 focus-within:border-transparent focus-within:ring-amber-500/30 overflow-hidden relative">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-amber-500 rounded-full shadow-lg shadow-amber-500/20"></div>
                                        <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px]">{cat}</span>
                                    </div>

                                    <div className="flex items-center gap-2 z-10 transition-transform origin-right">
                                        <input 
                                          type="text"
                                          placeholder="$0.00"
                                          value={inlineInputs[cat] || ''}
                                          onChange={(e) => setInlineInputs({...inlineInputs, [cat]: e.target.value})}
                                          onKeyDown={(e) => e.key === 'Enter' && handleInlineAdd(cat)}
                                          className="w-24 bg-transparent text-right text-[14px] font-black outline-none placeholder:text-slate-300 transition-all focus:text-amber-600"
                                        />
                                        {inlineInputs[cat] && (
                                          <button 
                                            onClick={() => handleInlineAdd(cat)}
                                            className="p-1.5 bg-amber-500 text-white rounded-xl hover:scale-110 shadow-lg transition-transform shrink-0"
                                          >
                                            <Check size={14} />
                                          </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className="p-4 bg-white/5 border-t border-white/5 flex flex-col gap-0.5">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 italic">Total Consumption</span>
                    <span className="text-sm font-black italic text-rose-600">-{formatCurrency(totalExpense)}</span>
                </div>
                {totals.usd > 0 && totals.khr > 0 && (
                  <div className="flex justify-end">
                    <span className="text-[9px] font-black italic text-slate-900/40 uppercase tracking-tight">
                      ${totals.usd.toLocaleString()} + {totals.khr.toLocaleString()} Riels
                    </span>
                  </div>
                )}
            </div>
        </div>

        {/* Detailed Transactions */}
        <div className="flex-1 bg-white/[0.005] backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-sm overflow-visible md:overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search records..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-slate-900 font-bold placeholder:text-slate-400 outline-none focus:border-amber-500 transition-all uppercase tracking-widest text-[10px]"
                    />
                </div>
            </div>

            <div className="p-4 bg-amber-50/50 border-b border-slate-100 flex items-center gap-3">
              <input 
                  type="text"
                  placeholder="What did you buy? (e.g. Lunch 5$)"
                  value={smartInput}
                  onChange={(e) => setSmartInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSmartAdd()}
                  className="flex-1 w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl py-3 px-4 text-xs font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 placeholder:italic"
              />
              <button 
                  onClick={handleSmartAdd}
                  disabled={!smartInput.trim()}
                  className="px-4 py-3 shrink-0 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50"
              >
                  Add
              </button>
            </div>

            <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar-amber px-6 py-2">
                <div className="space-y-3">
                    {filteredExpenses.map((expense) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          key={expense.id} 
                          className="group flex items-center justify-between p-4 bg-white/[0.002] hover:bg-white/[0.015] rounded-3xl transition-all border border-white/5"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl flex items-center justify-center ${expense.type === 'Income' ? 'bg-emerald-500/5 text-emerald-600' : 'bg-rose-500/5 text-rose-600'}`}>
                                   {expense.type === 'Income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 italic tracking-tight">{expense.description}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-900/40 flex items-center gap-1">
                                            {viewMode === 'Daily' ? `${format(new Date(expense.date), 'MMM dd')} • ${expense.category}` : `${expense.category} • ${(expense as any).count || 1} records`}
                                        </span>
                                        {expense.currency !== currencyMode && (
                                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-700 rounded-md border border-amber-500/10 uppercase">
                                             Saved in {expense.currency}
                                          </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className={`text-lg font-black italic tracking-tighter ${expense.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {expense.type === 'Income' ? '+' : '-'}{formatCurrency(expense.amount, expense.currency as 'USD' | 'KHR')}
                                </div>
                                {viewMode === 'Daily' && (
                                  <button 
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="p-2 opacity-0 group-hover:opacity-100 text-slate-900/10 hover:text-rose-600 transition-all"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {filteredExpenses.length === 0 && (
                        <div className="py-20 text-center text-slate-900/10">
                            <Wallet size={64} className="mx-auto mb-4 opacity-10" />
                            <p className="font-black text-[10px] uppercase tracking-[0.3em] italic">Vault is empty</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      <AnimatePresence>
          {isAdding && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
              >
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl border border-slate-200 relative"
                  >
                      <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase italic tracking-tighter">New Record</h3>
                      
                      <div className="space-y-5">
                          <div className="flex gap-3 p-1 bg-black/5 rounded-2xl">
                              <button 
                                onClick={() => setNewExpense({...newExpense, type: 'Expense'})}
                                className={`flex-1 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all ${newExpense.type === 'Expense' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-900/30'}`}
                              >
                                  Expense
                              </button>
                              <button 
                                onClick={() => setNewExpense({...newExpense, type: 'Income'})}
                                className={`flex-1 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all ${newExpense.type === 'Income' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-900/30'}`}
                              >
                                  Income
                              </button>
                          </div>

                          <div className="space-y-1">
                             <label className="text-[9px] font-black uppercase tracking-widest text-slate-900/40 ml-2">Description</label>
                             <input 
                                value={newExpense.description}
                                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                placeholder="What is this for?"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-6 text-slate-900 font-bold outline-none focus:border-amber-500 transition-all font-sans"
                             />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-900/40 ml-2">Amount</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-6 pr-12 text-slate-900 font-black outline-none focus:border-amber-500 transition-all font-sans"
                                    />
                                    <button 
                                      onClick={() => setNewExpense({...newExpense, currency: newExpense.currency === 'USD' ? 'KHR' : 'USD'})}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-amber-500 text-white rounded-lg text-[9px] font-black uppercase shadow-lg shadow-amber-500/10"
                                    >
                                      {newExpense.currency}
                                    </button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-900/40 ml-2">Category</label>
                                <select 
                                    value={newExpense.category}
                                    disabled={newExpense.type === 'Income'}
                                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-6 text-slate-900 font-black outline-none focus:border-amber-500 transition-all appearance-none font-sans"
                                >
                                    {newExpense.type === 'Income' ? (
                                      <option value="Income">Income</option>
                                    ) : (
                                      categories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                                    )}
                                </select>
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-4 mt-12">
                          <button onClick={() => setIsAdding(false)} className="flex-1 py-4 text-slate-900/30 font-black text-[10px] uppercase tracking-widest">Cancel</button>
                          <button 
                            onClick={handleAddExpense}
                            className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                          >
                            Save
                          </button>
                      </div>
                  </motion.div>
              </motion.div>
          )}

          {isManagingCategories && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
              >
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl border border-slate-200 relative"
                  >
                      <button onClick={() => setIsManagingCategories(false)} className="absolute top-8 right-8 text-slate-900/20 hover:text-slate-900">
                        <X size={20} />
                      </button>
                      
                      <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase italic tracking-tighter">Categories</h3>
                      
                      <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar-amber">
                        {categories.map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group border border-slate-200 shadow-sm">
                            {editingCategory?.index === idx ? (
                              <div className="flex-1 flex gap-2">
                                <input 
                                  value={editingCategory.value}
                                  onChange={(e) => setEditingCategory({...editingCategory, value: e.target.value})}
                                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 font-black uppercase text-[10px] tracking-widest outline-none"
                                />
                                <button onClick={handleRenameCategory} className="p-2 bg-emerald-500 text-white rounded-xl"><Check size={14} /></button>
                                <button onClick={() => setEditingCategory(null)} className="p-2 bg-slate-200 text-slate-500 rounded-xl"><X size={14} /></button>
                              </div>
                            ) : (
                              <>
                                <span className="font-black uppercase text-[10px] tracking-widest text-slate-900">{cat}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => setEditingCategory({index: idx, value: cat})} className="p-2 text-slate-300 hover:text-slate-900"><Edit2 size={14} /></button>
                                  <button onClick={() => handleDeleteCategory(idx)} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3">
                        <input 
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="New category..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-black uppercase text-[10px] tracking-widest outline-none focus:border-amber-500 transition-all text-slate-900"
                        />
                        <button 
                          onClick={handleAddCategory}
                          className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg"
                        >
                          Add
                        </button>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar-amber::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 158, 11, 0.3);
        }
      `}</style>
    </div>
  );
};
