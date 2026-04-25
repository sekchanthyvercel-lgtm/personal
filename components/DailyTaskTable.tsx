import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  FilterX,
  Plus,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  Trash2,
  Trash,
  LayoutGrid,
  List,
  CalendarDays,
  Calendar as CalendarIcon
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addWeeks, 
  subWeeks,
  startOfMonth,
  endOfMonth,
  getDay,
  isToday,
  addMonths,
  subMonths
} from 'date-fns';
import { Student, AppData, FilterState, Tab, UserRole } from '../types';

import { AIChatModal } from './AIChatModal';

const MultilineInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}> = ({ value, onChange, className, style, placeholder }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.max(36, scrollHeight) + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className={className}
      style={{ ...style, resize: 'none', overflow: 'hidden', display: 'block' }}
    />
  );
};

interface DailyTaskTableProps {
  students: Student[];
  data: AppData;
  filters: FilterState;
  setFilters?: (f: FilterState) => void;
  onUpdate: (data: AppData) => void;
  onAddStudent: (defaults: Partial<Student>) => void;
  role: UserRole;
  onClearCategory?: (categories: string[]) => void;
}

export const DailyTaskTable: React.FC<DailyTaskTableProps> = ({
  students,
  data,
  filters,
  setFilters,
  onUpdate,
  onAddStudent,
  role,
  onClearCategory
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'calendar'>('weekly');
  const [sortBy, setSortBy] = useState<'Priority' | 'Deadline'>('Priority');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showAIChat, setShowAIChat] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Week Interval
  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = addDays(weekStart, 6); // Sunday
  
  let days: Date[] = [];
  if (viewMode === 'daily') {
    days = [viewDate];
  } else if (viewMode === 'weekly') {
    days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  }

  const priorityWeight: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (s.category !== 'DailyTask') return false;
      const query = (filters.searchQuery || '').toLowerCase();
      const matchesSearch = !query || 
                           (s.name || '').toLowerCase().includes(query) || 
                           (s.level || '').toLowerCase().includes(query) ||
                           (s.shift || '').toLowerCase().includes(query) ||
                           (s.teachers || '').toLowerCase().includes(query) ||
                           (s.assistant || '').toLowerCase().includes(query) ||
                           (s.time || '').toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (filters.level && !s.level?.toUpperCase().includes(filters.level.toUpperCase())) return false;
      if (filters.time && !s.time?.toUpperCase().includes(filters.time.toUpperCase()) && !s.shift?.toUpperCase().includes(filters.time.toUpperCase())) return false;
      if (filters.teacher && !s.teachers?.toUpperCase().includes(filters.teacher.toUpperCase())) return false;
      if (filters.assistant && !s.assistant?.toUpperCase().includes(filters.assistant.toUpperCase())) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'Priority') {
        const pA = priorityWeight[a.priority || 'Medium'] || 0;
        const pB = priorityWeight[b.priority || 'Medium'] || 0;
        if (pA !== pB) return sortDir === 'asc' ? pA - pB : pB - pA;
      } else if (sortBy === 'Deadline') {
        const parseDate = (d?: string) => {
          if (!d || !d.includes('/')) return 0;
          const [day, month, year] = d.split('/');
          return new Date(`20${year}-${month}-${day}`).getTime();
        };
        const dA = parseDate(a.deadline);
        const dB = parseDate(b.deadline);
        if (dA !== dB) return sortDir === 'asc' ? dA - dB : dB - dA;
      }
      return (a.order || 0) - (b.order || 0);
    });
  }, [students, filters, sortBy, sortDir]);

  const contextData = useMemo(() => {
    return filteredStudents.map(s => `- ${s.name} (Priority: ${s.priority || 'Medium'}, Deadline: ${s.deadline || 'None'}, Energy Level: ${s.level || 'None'})`).join('\n');
  }, [filteredStudents]);

  const suggestTasks = async () => {
    setIsSuggesting(true);
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
      
      const prompt = `You are a high-performance productivity coach. Based on these existing personal development tasks:
${contextData}

Suggest 3 new actionable, high-impact tasks (e.g. mindfulness, learning, fitness, networking) that complement these, prioritizing what seems to be missing. 
Provide the response as a JSON array where each object has:
- name (string: the task name)
- priority (string: 'High', 'Medium', or 'Low')
- level (string: 'High Energy', 'Medium Energy', or 'Low Energy')
- shift (string: 'Morning', 'Afternoon', or 'Evening')

DO NOT wrap the response in markdown blocks like \`\`\`json. Just return the raw JSON array.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      if (response.text) {
          const suggestions = JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, ''));
          if (Array.isArray(suggestions)) {
              const newTasks = suggestions.map((s: any) => ({
                  id: crypto.randomUUID(),
                  category: 'DailyTask' as any,
                  name: s.name,
                  priority: s.priority,
                  level: s.level,
                  shift: s.shift,
                  order: filteredStudents.length + 1,
                  deadline: format(new Date(), 'dd/MM/yy')
              }));
              onUpdate({
                  ...data,
                  students: [...students, ...newTasks]
              });
          }
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate suggestions.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const toggleTask = (studentId: string, date: Date, taskSlot: 1 | 2) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const newTasks = { ...(data.dailyTasks || {}) };
    const studentTasks = { ...(newTasks[studentId] || {}) };
    const taskKey = `${dateKey}_${taskSlot}`;
    
    const current = studentTasks[taskKey];
    let next: string | undefined;
    
    if (current === 'Done') next = 'Not Yet';
    else if (current === 'Not Yet') next = undefined;
    else next = 'Done';

    if (next === undefined) {
      delete studentTasks[taskKey];
    } else {
      studentTasks[taskKey] = next;
    }

    newTasks[studentId] = studentTasks;
    onUpdate({ ...data, dailyTasks: newTasks });
  };

  const getLevelBorderColor = (level?: string) => {
    if (!level) return 'border-transparent';
    const l = level.toUpperCase();
    if (l.includes('1A')) return 'border-l-purple-500';
    if (l.includes('1B')) return 'border-l-orange-500';
    if (l.includes('2A')) return 'border-l-amber-500';
    if (l.includes('2B')) return 'border-l-teal-500';
    if (l.includes('3A')) return 'border-l-indigo-500';
    if (l.includes('3B')) return 'border-l-violet-500';
    if (l.includes('4A')) return 'border-l-emerald-500';
    return 'border-l-transparent';
  };

  const getStatusColor = (status?: string) => {
    if (status === 'Done') return 'bg-emerald-500 text-white';
    if (status === 'Not Yet') return 'bg-orange-500 text-white';
    return 'bg-slate-50 text-slate-300';
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'Done') return <CheckCircle2 size={12} />;
    if (status === 'Not Yet') return <XCircle size={12} />;
    return null;
  };

  const getRowBg = (idx: number) => {
    const colors = [
      'bg-emerald-400/10',
      'bg-emerald-400/10',
      'bg-amber-400/10',
      'bg-indigo-400/10',
      'bg-rose-400/10',
      'bg-violet-400/10',
      'bg-teal-400/10',
      'bg-orange-400/10'
    ];
    return colors[idx % colors.length];
  };

  const isoToDisplay = (iso: string) => {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y.slice(2)}`;
  };

  const displayToIso = (display: string) => {
      if (!display || !display.includes('/')) return '';
      const [d, m, y] = display.split('/');
      return `20${y}-${m}-${d}`;
  };

  const updateField = (id: string, key: string, val: any) => {
    let updates: any = { [key]: val };
    
    // Auto-fill deadline if name is entered
    if (key === 'name' && val && !students.find(s => s.id === id)?.deadline) {
        updates.deadline = format(new Date(), 'dd/MM/yy');
    }

    onUpdate({
      ...data,
      students: students.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const removeEntry = (id: string) => {
    if (confirm("Remove this teacher assignment?")) {
      onUpdate({
        ...data,
        students: students.filter(s => s.id !== id)
      });
    }
  };

  const filterSelectStyle = "bg-white/80 border border-slate-300/30 rounded-xl pl-8 pr-3 py-1.5 text-[10px] font-black uppercase text-slate-800 outline-none shadow-sm transition-all focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 hover:bg-white cursor-pointer h-9 appearance-none";

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden p-2 md:p-4 lg:p-6">
      <div className="bg-white/[0.01] backdrop-blur-[1px] rounded-[32px] p-6 mb-6 shadow-2xl shadow-indigo-900/10 border border-white/5 flex flex-wrap items-center justify-between gap-4 transition-all hover:bg-white/5">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <ClipboardList size={20} strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-950 uppercase tracking-tighter leading-none">Daily Task</h2>
            <p className="text-[9px] font-black text-slate-900 uppercase mt-1 tracking-[2px]">Task Tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-white/[0.05] rounded-xl border border-white/10 p-1 backdrop-blur-md mr-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <button onClick={() => setViewMode('daily')} className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'daily' ? 'bg-white text-orange-600 shadow-sm' : 'hover:text-slate-800 hover:bg-white/50'}`}>Daily</button>
            <button onClick={() => setViewMode('weekly')} className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'weekly' ? 'bg-white text-orange-600 shadow-sm' : 'hover:text-slate-800 hover:bg-white/50'}`}>Weekly</button>
            <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white text-orange-600 shadow-sm' : 'hover:text-slate-800 hover:bg-white/50'}`}>Calendar</button>
          </div>

          <div className="flex items-center bg-white/[0.05] p-1 rounded-xl border border-white/10 backdrop-blur-[4px]">
             <button onClick={() => {
                if (viewMode === 'calendar') setViewDate(subMonths(viewDate, 1));
                else if (viewMode === 'weekly') setViewDate(subWeeks(viewDate, 1));
                else setViewDate(addDays(viewDate, -1));
             }} className="p-1.5 text-slate-600 hover:text-orange-600 transition-colors">
               <ChevronLeft size={16} />
             </button>
             <div className="px-4 text-center min-w-[140px]">
               <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                 {viewMode === 'daily' ? format(viewDate, 'MMM d, yyyy') : viewMode === 'calendar' ? format(viewDate, 'MMMM yyyy') : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`}
               </p>
             </div>
             <button onClick={() => {
                if (viewMode === 'calendar') setViewDate(addMonths(viewDate, 1));
                else if (viewMode === 'weekly') setViewDate(addWeeks(viewDate, 1));
                else setViewDate(addDays(viewDate, 1));
             }} className="p-1.5 text-slate-600 hover:text-orange-600 transition-colors">
               <ChevronRight size={16} />
             </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end shrink-0">
          <button 
            onClick={suggestTasks}
            disabled={isSuggesting}
            className="h-9 px-4 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl flex items-center gap-2 hover:bg-purple-600 hover:text-white transition-all shadow-sm font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
          >
            <Zap size={14} /> {isSuggesting ? 'Thinking...' : 'AI Suggest'}
          </button>
          <button 
            onClick={() => setShowAIChat(true)}
            className="h-9 px-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm font-black text-[10px] uppercase tracking-widest"
          >
            <MessageSquare size={14} /> AI Chat
          </button>
          
          {role === 'Admin' && (
            <button 
              onClick={() => onClearCategory?.(['DailyTask'])}
              className="w-9 h-9 bg-orange-50 text-orange-500 border border-orange-100 rounded-xl flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all shadow-sm"
              title="Clear All Tasks"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button 
            onClick={() => onAddStudent({ category: 'DailyTask', shift: 'Morning' })}
            className="flex items-center gap-2 h-9 px-4 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
          >
            <Plus size={14} strokeWidth={4} /> Add Task
          </button>
        </div>

        {/* Filter Bar */}
        <div className="w-full basis-full flex flex-wrap items-center gap-3 pt-4 border-t border-slate-300/30 overflow-x-auto no-scrollbar pointer-events-auto shrink-0 relative">
              <div className="relative w-64 shrink-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                      type="text" 
                      placeholder="Search tasks..." 
                      className="w-full h-9 pl-9 pr-3 bg-white border border-slate-300/30 rounded-xl shadow-sm text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                      value={filters.searchQuery || ''}
                      onChange={e => setFilters?.({...filters, searchQuery: e.target.value})}
                  />
              </div>

              <div className="flex items-center gap-2 shrink-0 border-l border-slate-300/30 pl-4">
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.teacher || ''} onChange={e => setFilters?.({...filters, teacher: e.target.value})} className={filterSelectStyle}>
                          <option value="">Categories</option>
                          {Array.from(new Set(students.filter(s => s.category === 'DailyTask').map(s => s.teachers?.split('&')?.[0]?.trim()).filter(Boolean))).sort().map(t => <option key={t as string} value={t as string}>{t as React.ReactNode}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.assistant || ''} onChange={e => setFilters?.({...filters, assistant: e.target.value})} className={filterSelectStyle}>
                          <option value="">Sub-Categories</option>
                          {Array.from(new Set(students.filter(s => s.category === 'DailyTask').map(s => s.assistant?.trim()).filter(Boolean))).sort().map(a => <option key={a as string} value={a as string}>{a as React.ReactNode}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.level || ''} onChange={e => setFilters?.({...filters, level: e.target.value})} className={filterSelectStyle}>
                          <option value="">All Energy Levels</option>
                          {Array.from(new Set(students.filter(s => s.category === 'DailyTask').map(s => s.level?.trim()).filter(Boolean))).sort().map(l => <option key={l as string} value={l as string}>{l as React.ReactNode}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.time || ''} onChange={e => setFilters?.({...filters, time: e.target.value})} className={filterSelectStyle}>
                          <option value="">All Times</option>
                          {Array.from(new Set(students.filter(s => s.category === 'DailyTask').map(s => s.shift?.trim()).filter(Boolean))).sort().map(tm => <option key={tm as string} value={tm as string}>{tm as React.ReactNode}</option>)}
                      </select>
                  </div>

                  <button onClick={() => setFilters?.({...filters, searchQuery: '', level: '', time: '', teacher: '', assistant: ''})} className="p-2 ml-1 bg-white/50 border border-slate-300/30 text-slate-800 hover:bg-white rounded-xl transition-all shadow-sm" title="Clear Filters">
                      <Trash2 size={16} />
                  </button>
              </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="flex-1 bg-white/[0.01] backdrop-blur-[1px] rounded-[40px] shadow-2xl shadow-indigo-900/10 border border-white/5 p-6 overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 flex-1 overflow-auto custom-scrollbar pr-2 pb-2">
            {Array.from({ length: getDay(startOfMonth(viewDate)) === 0 ? 6 : getDay(startOfMonth(viewDate)) - 1 }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white/5 rounded-2xl min-h-[100px] opacity-20 border border-white/10"></div>
            ))}
            {eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) }).map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const isTodayDate = isToday(day);
              
              let totalTasks = 0;
              let doneTasks = 0;
              
              filteredStudents.forEach(s => {
                if (s.category === 'DailyTask') {
                  const s1 = data.dailyTasks?.[s.id]?.[`${dateKey}_1`];
                  const s2 = data.dailyTasks?.[s.id]?.[`${dateKey}_2`];
                  if (s1 === 'Done') doneTasks++;
                  if (s2 === 'Done') doneTasks++;
                  if (s1 || s2) totalTasks += (s1 ? 1 : 0) + (s2 ? 1 : 0);
                }
              });

              return (
                <div 
                  key={day.toISOString()} 
                  onClick={() => { setViewDate(day); setViewMode('daily'); }}
                  className={`bg-white/40 hover:bg-white/80 backdrop-blur-md transition-all rounded-2xl min-h-[100px] p-3 cursor-pointer flex flex-col items-start justify-start group relative border ${isTodayDate ? 'border-orange-500 shadow-sm shadow-orange-500/20' : 'border-white/40'}`}
                >
                  <span className={`text-xs font-black rounded-lg px-2 py-1 ${isTodayDate ? 'bg-orange-500 text-white' : 'text-slate-600 bg-white/50 group-hover:bg-orange-50 group-hover:text-orange-600'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {doneTasks > 0 && (
                    <div className="mt-auto w-full">
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-1.5 rounded-lg border border-emerald-100/50">
                        <CheckCircle2 size={12} />
                        <span className="text-[9px] font-black tracking-widest">{doneTasks} Done</span>
                      </div>
                    </div>
                  )}
                  {totalTasks > 0 && doneTasks < totalTasks && (
                    <div className="mt-1 w-full flex items-center justify-between px-1">
                       <span className="text-[9px] font-black text-slate-400">{totalTasks - doneTasks} Pending</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
      <div className="flex-1 bg-white/[0.01] backdrop-blur-[1px] rounded-[40px] shadow-2xl shadow-indigo-900/10 border border-white/5 overflow-hidden flex flex-col transition-all">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full border-collapse table-fixed min-w-[1000px]">
            <thead className="sticky top-0 z-40 bg-white/[0.01] backdrop-blur-[1px]">
              <tr className="border-b border-white/5">
                <th className="w-10 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-900 border-r border-white/5 sticky left-0 z-50 bg-white/[0.01] backdrop-blur-[1px]">#</th>
                <th className="w-48 px-4 py-4 text-left text-[9px] font-black uppercase text-slate-900 border-r border-white/5 sticky left-10 z-50 bg-white/[0.01] backdrop-blur-[1px]">Task Name</th>
                <th 
                  className="w-24 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-900 border-r border-white/5 backdrop-blur-[1px] cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => {
                      if (sortBy === 'Priority') setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('Priority'); setSortDir('desc'); }
                  }}
                  title="Sort by Priority"
                >
                  Priority {sortBy === 'Priority' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th className="w-24 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-900 border-r border-white/5 backdrop-blur-[1px]">Energy Level</th>
                <th className="w-24 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-900 border-r border-white/5 backdrop-blur-[1px]">Time</th>
                <th className="w-24 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-900 border-r border-white/5 backdrop-blur-[1px]">Category</th>
                <th className="w-24 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-900 border-r border-white/5 backdrop-blur-[1px]">Sub-Cat.</th>
                <th 
                  className="w-28 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-900 border-r border-white/5 backdrop-blur-[1px] cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => {
                      if (sortBy === 'Deadline') setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('Deadline'); setSortDir('asc'); }
                  }}
                  title="Sort by Deadline"
                >
                  Deadline {sortBy === 'Deadline' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
                
                {days.map(day => (
                  <th key={day.toString()} className="w-36 border-r border-white/5 p-0 overflow-hidden">
                    <div className="text-center py-1.5 border-b border-white/5 bg-emerald-400/5">
                      <p className="text-[9px] font-black text-emerald-700">{format(day, 'EEE').toUpperCase()}</p>
                      <p className="text-[8px] font-bold text-slate-500">{format(day, 'MMM d')}</p>
                    </div>
                    <div className="flex divide-x divide-white/5 h-8">
                      <div className="flex-1 text-[7px] font-black text-slate-400 uppercase flex items-center justify-center tracking-tighter">T1</div>
                      <div className="flex-1 text-[7px] font-black text-slate-400 uppercase flex items-center justify-center tracking-tighter">T2</div>
                    </div>
                  </th>
                ))}
                
                <th className="w-12 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-500">X</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-300">
                      <ClipboardList size={40} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No tasks assigned</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.map((s, idx) => (
                <tr key={s.id} className={`transition-colors group h-12 ${getRowBg(idx)} hover:brightness-95`}>
                  <td className="text-center text-[9px] font-black text-slate-500 border-r border-slate-100 sticky left-0 z-30 bg-inherit">{idx + 1}</td>
                  <td className={`px-2 border-r border-slate-100 sticky left-10 z-30 group-hover:opacity-90 transition-opacity border-l-[4px] ${getLevelBorderColor(s.level)} bg-inherit`}>
                    <MultilineInput 
                      value={s.name} 
                      onChange={val => updateField(s.id, 'name', val)}
                      placeholder="Task Name"
                      className="w-full h-full px-2 py-2 bg-transparent text-slate-900 text-[11px] font-black outline-none placeholder:text-slate-400"
                    />
                  </td>
                  <td className="border-r border-slate-100">
                    <select 
                      value={s.priority || 'Medium'} 
                      onChange={e => updateField(s.id, 'priority', e.target.value)}
                      className={`w-full h-full px-1 bg-transparent text-[9px] font-black outline-none text-center appearance-none uppercase ${s.priority === 'High' ? 'text-rose-600' : s.priority === 'Low' ? 'text-slate-500' : 'text-amber-500'}`}
                    >
                      <option value="High" className="text-rose-600">High</option>
                      <option value="Medium" className="text-amber-500">Medium</option>
                      <option value="Low" className="text-slate-500">Low</option>
                    </select>
                  </td>
                  <td className="border-r border-slate-100">
                    <MultilineInput 
                      value={s.level || ''} 
                      onChange={val => updateField(s.id, 'level', val)}
                      placeholder="Energy (e.g. High)"
                      className="w-full h-full px-2 py-2 bg-transparent text-slate-900 text-[10px] font-black outline-none text-center placeholder:text-slate-400"
                    />
                  </td>
                  <td className="border-r border-slate-100">
                    <select 
                      value={s.shift || 'Morning'} 
                      onChange={e => updateField(s.id, 'shift', e.target.value)}
                      className="w-full h-full px-1 bg-transparent text-[9px] font-black text-emerald-600 outline-none text-center appearance-none uppercase"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                    </select>
                  </td>
                  <td className="border-r border-slate-100">
                    <MultilineInput 
                      value={s.teachers || ''} 
                      onChange={val => updateField(s.id, 'teachers', val)}
                      placeholder="Category"
                      className="w-full h-full px-2 py-2 bg-transparent text-slate-900 text-[10px] font-black outline-none text-center placeholder:text-slate-400"
                    />
                  </td>
                  <td className="border-r border-slate-100">
                    <MultilineInput 
                      value={s.assistant || ''} 
                      onChange={val => updateField(s.id, 'assistant', val)}
                      placeholder="Sub-Category"
                      className="w-full h-full px-2 py-2 bg-transparent text-slate-900 text-[10px] font-black outline-none text-center placeholder:text-slate-400"
                    />
                  </td>
                  <td className="border-r border-slate-100 px-2">
                    <input 
                      type="date"
                      value={displayToIso(s.deadline || '')} 
                      onChange={e => updateField(s.id, 'deadline', isoToDisplay(e.target.value))}
                      className="w-full bg-transparent text-[10px] font-black text-orange-600 outline-none text-center cursor-pointer"
                    />
                  </td>

                  {days.map(day => {
                    const status1 = data.dailyTasks?.[s.id]?.[`${format(day, 'yyyy-MM-dd')}_1`];
                    const status2 = data.dailyTasks?.[s.id]?.[`${format(day, 'yyyy-MM-dd')}_2`];
                    
                    return (
                      <td key={day.toString()} className="border-r border-slate-100 p-0 overflow-hidden">
                        <div className="flex h-full min-h-[48px]">
                          <button 
                            onClick={() => toggleTask(s.id, day, 1)}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all group/btn ${getStatusColor(status1)}`}
                          >
                            {getStatusIcon(status1)}
                            <span className="text-[7px] font-black uppercase tracking-tighter opacity-80">
                              {status1 || '···'}
                            </span>
                          </button>
                          <div className="w-[1px] bg-slate-100/50"></div>
                          <button 
                            onClick={() => toggleTask(s.id, day, 2)}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all group/btn ${getStatusColor(status2)}`}
                          >
                            {getStatusIcon(status2)}
                            <span className="text-[7px] font-black uppercase tracking-tighter opacity-80">
                              {status2 || '···'}
                            </span>
                          </button>
                        </div>
                      </td>
                    );
                  })}

                  <td className="text-center">
                    <button onClick={() => removeEntry(s.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
      <AIChatModal isOpen={showAIChat} onClose={() => setShowAIChat(false)} contextData={contextData} />
    </div>
  );
};
