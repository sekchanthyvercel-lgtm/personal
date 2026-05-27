import React, { useMemo } from 'react';
import { AppData } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { format, subDays, eachDayOfInterval, isSameDay, parseISO, isValid, startOfWeek } from 'date-fns';
import { TrendingUp, TrendingDown, Activity, Wallet, Target, Sparkles, Brain, ArrowUpRight, Download } from 'lucide-react';

interface DashboardProps {
  data: AppData;
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

const calculateStreak = (habit: any, completions: any) => {
  let currentStreak = 0;
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const yesterdayKey = format(subDays(today, 1), 'yyyy-MM-dd');

  const isCompleted = (dateKey: string) => {
    const comp = completions[dateKey]?.[habit.id];
    if (comp === undefined || comp === null) return false;
    if (habit.isNumeric) {
      return typeof comp === 'number' ? comp >= (habit.targetValue || 0) : !!comp;
    }
    return !!comp;
  };

  let dateToCheck = today;
  if (!isCompleted(todayKey)) {
    if (!isCompleted(yesterdayKey)) return 0;
    dateToCheck = subDays(today, 1);
  }

  let safetyLimit = 1000;
  while (safetyLimit > 0) {
    safetyLimit--;
    const dateKey = format(dateToCheck, 'yyyy-MM-dd');
    if (isCompleted(dateKey)) {
      currentStreak++;
      dateToCheck = subDays(dateToCheck, 1);
    } else {
      break;
    }
  }
  return currentStreak;
};

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const exportToCSV = () => {
    const habits = data.habits || [];
    const completions = data.habitCompletions || {};
    const journalEntries = data.journalEntries || {};
    
    // Collect all unique dates from completions and journal entries
    const allDates = new Set<string>();
    Object.keys(completions).forEach(d => allDates.add(d));
    Object.keys(journalEntries).forEach(d => allDates.add(d));
    
    // If no dates, add today
    if (allDates.size === 0) {
      allDates.add(format(new Date(), 'yyyy-MM-dd'));
    }
    
    const sortedDates = Array.from(allDates).sort();
    
    // Headers
    const headers = [
      'Date',
      'Weekday',
      ...habits.map(h => `Habit: ${h.name.replace(/"/g, '""')}`),
      'Total Habits Completed',
      'Completion Rate %',
      'Energy Rating (0-10)',
      'Focus Rating (0-10)',
      'Productivity Rating (0-10)',
      'Stress Rating (0-10)',
      'Gratitude Rating (0-10)',
      'Vitality Rating (0-10)',
      'Journal Entry Saved'
    ];
    
    let csvContent = '\uFEFF'; // Add BOM for Excel UTF-8 support
    csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
    
    sortedDates.forEach(dateStr => {
      let dateObj;
      try {
        dateObj = parseISO(dateStr);
      } catch(e) {
        dateObj = new Date(dateStr);
      }
      
      let weekday = 'Unknown';
      if (isValid(dateObj)) {
        weekday = format(dateObj, 'EEEE');
      }
      
      const habitCompletedStatuses = habits.map(h => {
        const comp = completions[dateStr]?.[h.id];
        if (comp === undefined || comp === null) return 'No Track';
        if (h.isNumeric) {
          const threshold = h.targetValue || 1;
          const valText = typeof comp === 'number' ? comp : (comp ? threshold : 0);
          const done = valText >= threshold;
          return done ? `Completed (${valText}/${threshold} ${h.unit || ''})` : `Incomplete (${valText}/${threshold} ${h.unit || ''})`;
        } else {
          return comp ? 'Completed' : 'Incomplete';
        }
      });
      
      const totalCompleted = habits.filter(h => {
        const comp = completions[dateStr]?.[h.id];
        if (comp === undefined || comp === null) return false;
        if (h.isNumeric) {
          return typeof comp === 'number' ? comp >= (h.targetValue || 1) : !!comp;
        }
        return !!comp;
      }).length;
      
      const completionRate = habits.length > 0 ? ((totalCompleted / habits.length) * 100).toFixed(1) : '0';
      
      const journal = journalEntries[dateStr];
      const energy = journal?.energyRating !== undefined ? journal.energyRating : '';
      const focus = journal?.focusRating !== undefined ? journal.focusRating : '';
      const productivity = journal?.productivityRating !== undefined ? journal.productivityRating : '';
      const stress = journal?.stressRating !== undefined ? journal.stressRating : '';
      const gratitude = journal?.gratitudeRating !== undefined ? journal.gratitudeRating : ''; 
      const vitality = journal?.vitalityRating !== undefined ? journal.vitalityRating : '';
      const isCompleted = journal ? 'Yes' : 'No';
      
      const row = [
        dateStr,
        weekday,
        ...habitCompletedStatuses,
        totalCompleted,
        completionRate,
        energy,
        focus,
        productivity,
        stress,
        gratitude,
        vitality,
        isCompleted
      ];
      
      csvContent += row.map(val => {
        const cleaned = String(val).replace(/"/g, '""');
        return `"${cleaned}"`;
      }).join(',') + '\n';
    });
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Habit_Progress_Statistics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
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

  const radarHabitData = useMemo(() => {
    const habits = data.habits || [];
    const completions = data.habitCompletions || {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      return format(subDays(new Date(), i), 'yyyy-MM-dd');
    });

    const list = habits.map(habit => {
      let completedCount = 0;
      last7Days.forEach(dateKey => {
        const comp = completions[dateKey]?.[habit.id];
        if (comp !== undefined && comp !== null) {
          const isCompleted = habit.isNumeric
            ? (typeof comp === 'number' ? comp >= (habit.targetValue || 1) : !!comp)
            : !!comp;
          if (isCompleted) completedCount++;
        }
      });
      const percent = Math.round((completedCount / 7) * 100);
      return {
        subject: habit.name.length > 12 ? habit.name.substring(0, 12) + '...' : habit.name,
        Percentage: percent,
        fullMark: 100
      };
    });

    // If there are no habits, output a warm placeholder set of classic high-performance metrics
    if (list.length === 0) {
      return [
        { subject: 'Focus block', Percentage: 75, fullMark: 100 },
        { subject: 'Hydration', Percentage: 90, fullMark: 100 },
        { subject: 'Slow Reading', Percentage: 60, fullMark: 100 },
        { subject: 'Walk/Nature', Percentage: 80, fullMark: 100 },
        { subject: 'Gratitude', Percentage: 85, fullMark: 100 },
      ];
    }
    return list;
  }, [data.habits, data.habitCompletions]);

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

  // 5. Habit Streaks Data
  const streakData = useMemo(() => {
    return (data.habits || []).map(habit => ({
      name: habit.name.length > 15 ? habit.name.substring(0, 15) + '...' : habit.name,
      streak: calculateStreak(habit, data.habitCompletions || {})
    })).sort((a, b) => b.streak - a.streak).slice(0, 10); // Show top 10
  }, [data.habits, data.habitCompletions]);

  // Weekly comparisons of Income vs. Expense
  const weeklyFinanceData = useMemo(() => {
    const expenses = data.expenses || [];
    const exchangeRate = data.settings?.exchangeRate || 4000;
    
    // Group entries by week start (Monday)
    const weekMap: Record<string, { income: number; expense: number }> = {};
    
    expenses.forEach(e => {
      if (!e.date) return;
      let d: Date;
      try {
        d = new Date(e.date);
        if (isNaN(d.getTime())) return;
      } catch (err) {
        return;
      }
      
      const wkStart = startOfWeek(d, { weekStartsOn: 1 }); // Monday start
      const key = format(wkStart, 'yyyy-MM-dd');
      
      if (!weekMap[key]) {
        weekMap[key] = { income: 0, expense: 0 };
      }
      
      const val = e.currency === 'KHR' ? e.amount / exchangeRate : e.amount;
      if (e.type === 'Income') {
        weekMap[key].income += val;
      } else {
        weekMap[key].expense += val;
      }
    });
    
    // Turn map into sorted list of recent 6 weeks
    const allWeeks = Object.keys(weekMap).sort();
    
    // If we have no weeks at all, add a default fallback empty week so the chart doesn't look bad
    if (allWeeks.length === 0) {
      const todayWk = startOfWeek(new Date(), { weekStartsOn: 1 });
      allWeeks.push(format(todayWk, 'yyyy-MM-dd'));
      weekMap[format(todayWk, 'yyyy-MM-dd')] = { income: 0, expense: 0 };
    }
    
    return allWeeks.slice(-6).map(key => {
      const d = new Date(key);
      const values = weekMap[key];
      return {
        _rawDate: key,
        week: `Wk of ${format(d, 'MMM dd')}`,
        Income: Math.round(values.income * 100) / 100,
        Expense: Math.round(values.expense * 100) / 100,
      };
    });
  }, [data.expenses, data.settings?.exchangeRate]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar-amber p-4 md:p-8 bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
      <div className="w-full space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Growth Analytics</h1>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Measuring progress, reflecting on performance</p>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
             <button
                id="export-progress-stats-btn"
                onClick={exportToCSV}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-3xl shadow-sm border border-slate-800 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
             >
                <Download size={14} strokeWidth={3} />
                <span>Export Stats</span>
             </button>
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

          {/* Weekly Habit Trends (Balanced Growth Radar) */}
          <ChartContainer title="Weekly Habit Trends (Balanced Growth)" icon={Activity} color="indigo">
            <div className="space-y-4">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider pl-1">A high-density radar visualization mapping structured task symmetry and growth fields.</p>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarHabitData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} />
                  <Radar name="Completion %" dataKey="Percentage" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
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

          {/* Weekly Income vs. Expense Comparison */}
          <ChartContainer title="Weekly Cashflow Comparison" icon={Activity} color="indigo" className="lg:col-span-2">
            <div className="space-y-4">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider pl-1">Identify your best earning and worst spending periods week-by-week (normalized to USD $)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyFinanceData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#64748b'}} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    formatter={(value: any) => [`$${value}`, '']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>

          {/* Long-Term Habit Streaks */}
          <ChartContainer title="Long-Term Habit Streaks" icon={Target} color="emerald" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={streakData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="streak" name="Current Streak (Days)" fill="#10b981" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
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
