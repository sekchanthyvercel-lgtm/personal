import React, { useMemo } from 'react';
import { AppData } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { format, subDays, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Activity, Wallet, Target, Sparkles, Brain, ArrowUpRight } from 'lucide-react';

interface DashboardProps {
  data: AppData;
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  // 1. Habit Completion Data (Last 7 days)
  const habitData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    return days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const completions = data.habitCompletions?.[dateKey] || {};
      const completedCount = Object.values(completions).filter(Boolean).length;
      const totalHabits = data.habits?.length || 0;
      
      return {
        date: format(day, 'MMM dd'),
        completed: completedCount,
        percentage: totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0
      };
    });
  }, [data.habitCompletions, data.habits]);

  // 2. Expense Category Breakdown
  const expenseData = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthlyExpenses = (data.expenses || []).filter(e => 
      e.type === 'Expense' && e.date.startsWith(currentMonth)
    );

    const categories: Record<string, number> = {};
    monthlyExpenses.forEach(e => {
      // Basic normalization to USD for the chart
      const amount = e.currency === 'KHR' ? (e.amount / (data.settings?.exchangeRate || 4000)) : e.amount;
      categories[e.category] = (categories[e.category] || 0) + amount;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data.expenses, data.settings?.exchangeRate]);

  // 3. Productivity Ratings (from Journal)
  const productivityData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 14),
      end: new Date(),
    });

    return days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const entry = data.journalEntries?.[dateKey];
      
      return {
        date: format(day, 'MMM dd'),
        energy: entry?.energyRating || 0,
        focus: entry?.focusRating || 0,
        productivity: entry?.productivityRating || 0
      };
    }).filter(d => d.energy > 0 || d.focus > 0 || d.productivity > 0);
  }, [data.journalEntries]);

  // 4. Financial Status Overview
  const financeOverview = useMemo(() => {
    const expenses = data.expenses || [];
    const totalIncome = expenses.filter(e => e.type === 'Income').reduce((acc, curr) => {
      const amt = curr.currency === 'KHR' ? curr.amount / (data.settings?.exchangeRate || 4000) : curr.amount;
      return acc + amt;
    }, 0);
    const totalExpense = expenses.filter(e => e.type === 'Expense').reduce((acc, curr) => {
      const amt = curr.currency === 'KHR' ? curr.amount / (data.settings?.exchangeRate || 4000) : curr.amount;
      return acc + amt;
    }, 0);

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense
    };
  }, [data.expenses, data.settings?.exchangeRate]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar-amber p-4 md:p-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Growth Analytics</h1>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Measuring progress, reflecting on performance</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                   <TrendingUp size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Balance</p>
                   <p className="text-xl font-black text-slate-900 italic tracking-tighter">${financeOverview.balance.toFixed(2)}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatCard 
              label="Active Habits" 
              value={data.habits?.length || 0} 
              icon={Activity} 
              color="orange"
              trend="+2 this week"
           />
           <StatCard 
              label="Total Income" 
              value={`$${financeOverview.income.toFixed(0)}`} 
              icon={TrendingUp} 
              color="emerald"
              trend="All time"
           />
           <StatCard 
              label="Total Expenses" 
              value={`$${financeOverview.expense.toFixed(0)}`} 
              icon={TrendingDown} 
              color="rose"
              trend="All time"
           />
           <StatCard 
              label="Notes Count" 
              value={(data.dpssTopics?.length || 0) + (data.selfLearningTopics?.length || 0)} 
              icon={Brain} 
              color="indigo"
              trend="Knowledge base"
           />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Habit Trends */}
          <ChartContainer title="Habit Adherence (Last 7 Days)" icon={Target} color="orange">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={habitData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="completed" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Expense Breakdown */}
          <ChartContainer title="Expense Breakdown (This Month)" icon={Wallet} color="rose">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full md:w-48 space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Top Categories</p>
                 {expenseData.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-600">{item.name}</span>
                       <span className="text-xs font-black text-slate-900 italic">${item.value.toFixed(0)}</span>
                    </div>
                 ))}
              </div>
            </div>
          </ChartContainer>

          {/* Performance Tracking */}
          <ChartContainer title="Peak Performance (Last 14 Days)" icon={Sparkles} color="indigo" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={productivityData}>
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} domain={[0, 10]} />
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Legend />
                <Area type="monotone" dataKey="productivity" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
                <Area type="monotone" dataKey="focus" stroke="#8b5cf6" strokeWidth={3} fill="none" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={3} fill="none" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>

        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: any; color: string; trend?: string }> = ({ label, value, icon: Icon, color, trend }) => {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-4 rounded-2xl ${colorMap[color] || 'bg-slate-50'} transition-transform group-hover:scale-110`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-rose-600 uppercase tracking-tighter">
           <TrendingUp size={12} />
           {trend}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{value}</p>
      </div>
    </div>
  );
};

const ChartContainer: React.FC<{ title: string; icon: any; color: string; children: React.ReactNode; className?: string }> = ({ title, icon: Icon, color, children, className }) => (
  <div className={`bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm ${className}`}>
    <div className="flex items-center gap-4 mb-8">
      <div className={`p-2 rounded-xl text-white ${color === 'orange' ? 'bg-orange-500' : color === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'} shadow-lg shadow-current/20`}>
        <Icon size={18} strokeWidth={3} />
      </div>
      <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">{title}</h2>
    </div>
    {children}
  </div>
);

export default Dashboard;
