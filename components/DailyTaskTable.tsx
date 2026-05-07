import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
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
  Calendar as CalendarIcon,
  MessageSquare,
  TrendingUp,
  Target,
  Trophy
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
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.max(36, scrollHeight) + 'px';
    }
  }, [localValue]);

  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      placeholder={placeholder}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onChange(localValue)}
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
  onUpdateDailyTasks?: (studentId: string, date: string, slot: 1 | 2, status: string | undefined) => void;
  onUpdateStudent?: (id: string, updates: Partial<Student>) => void;
  onAddStudent: (defaults: Partial<Student>) => void;
  onDeleteStudent?: (id: string) => void;
  role: UserRole;
  onClearCategory?: (categories: string[]) => void;
}

export const DailyTaskTable: React.FC<DailyTaskTableProps> = ({
  students,
  data,
  filters,
  setFilters,
  onUpdate,
  onUpdateDailyTasks,
  onUpdateStudent,
  onAddStudent,
  onDeleteStudent,
  role,
  onClearCategory
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'calendar'>('weekly');
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
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
      // @ts-ignore
      const envKeys = import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY || '';
      const keys = envKeys.split(',').map(k => k.trim()).filter(Boolean);
      const ai = new GoogleGenAI({ apiKey: keys[0] || '' });
      
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
        model: "gemini-1.5-flash",
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

    if (onUpdateDailyTasks) {
      onUpdateDailyTasks(studentId, dateKey, taskSlot, next);
    } else {
      newTasks[studentId] = studentTasks;
      onUpdate({ ...data, dailyTasks: newTasks });
    }
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

    if (onUpdateStudent) {
      onUpdateStudent(id, updates);
    } else {
      onUpdate({
        ...data,
        students: students.map(s => s.id === id ? { ...s, ...updates } : s)
      });
    }
  };

  const removeEntry = (id: string) => {
    if (onDeleteStudent) {
      onDeleteStudent(id);
    } else if (confirm("Remove this teacher assignment?")) {
      onUpdate({
        ...data,
        students: students.filter(s => s.id !== id)
      });
    }
  };

  const filterSelectStyle = "bg-white/80 border border-slate-300/30 rounded-xl pl-8 pr-3 py-1.5 text-[10px] font-black uppercase text-slate-800 outline-none shadow-sm transition-all focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 hover:bg-white cursor-pointer h-9 appearance-none";

  const dpssSettings = data.settings || { fontSize: 12, fontFamily: "'Inter', sans-serif" };
  const textFontFamily = dpssSettings.textFontFamily || dpssSettings.fontFamily;
  const textFontSize = dpssSettings.textFontSize || 16;

  // Task Statistics
  const stats = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    let total = 0;
    let completed = 0;
    
    filteredStudents.forEach(s => {
      const s1 = data.dailyTasks?.[s.id]?.[`${todayKey}_1`];
      const s2 = data.dailyTasks?.[s.id]?.[`${todayKey}_2`];
      if (s1) total++;
      if (s2) total++;
      if (s1 === 'Done') completed++;
      if (s2 === 'Done') completed++;
    });
    
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percentage };
  }, [filteredStudents, data.dailyTasks]);

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-y-auto md:overflow-hidden p-2 md:p-4 lg:p-6" style={{ fontFamily: textFontFamily }}>
      <div className={`bg-white/40 backdrop-blur-xl rounded-[30px] md:rounded-[40px] shadow-2xl shadow-indigo-900/10 border border-white/60 transition-all relative overflow-hidden flex flex-col shrink-0 ${isHeaderHidden ? 'p-3 mb-2' : 'p-4 md:p-8 mb-6'}`}>
        
        {/* Header Toggle for Mobile */}
        <button 
           onClick={() => setIsHeaderHidden(!isHeaderHidden)}
           className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center text-slate-500 hover:text-orange-600 border border-slate-200/50 transition-all md:hidden shadow-lg"
        >
           {isHeaderHidden ? <ChevronDown size={22} /> : <ChevronLeft size={22} className="rotate-90" />}
        </button>

        {!isHeaderHidden && (
          <>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -ml-32 -mb-32"></div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-6 shrink-0 relative z-10 w-full lg:w-auto">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[20px] md:rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-orange-500/40 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                  <ClipboardList size={window.innerWidth < 768 ? 24 : 32} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1 md:mb-2">Executive Mission</h2>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 md:px-3 md:py-1 bg-orange-100 text-orange-600 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-orange-200">System Ready</span>
                    <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[4px] hidden sm:inline">Strategy Hub</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:gap-6 relative z-10 w-full lg:w-auto justify-between lg:justify-end">
                {/* Professional Stats Summary - visible on large screens or inline for medium */}
                <div className="hidden sm:flex items-center gap-4 md:gap-8 bg-white/20 px-4 md:px-6 py-2 md:py-3 rounded-[20px] md:rounded-[30px] border border-white/40 shadow-sm">
                  <div className="flex flex-col items-center">
                      <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">Efficiency</span>
                      <p className="text-sm md:text-lg font-black text-slate-900">{stats.percentage}%</p>
                  </div>
                  <div className="w-[1px] h-6 md:h-8 bg-slate-200"></div>
                  <div className="flex flex-col items-center">
                      <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">Velocity</span>
                      <p className="text-sm md:text-lg font-black text-slate-900">{stats.completed}/{stats.total}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 flex-1 lg:flex-none justify-end">
                  <button 
                    onClick={suggestTasks}
                    disabled={isSuggesting}
                    className="h-10 md:h-12 px-3 md:px-6 bg-purple-600 text-white rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3 hover:bg-purple-700 transition-all shadow-xl shadow-purple-500/20 font-black text-[9px] md:text-[11px] uppercase tracking-widest disabled:opacity-50"
                  >
                    <Zap size={14} fill="currentColor" /> <span className="hidden sm:inline">{isSuggesting ? 'Optimizing...' : 'Strategic Plan'}</span><span className="sm:hidden">Plan</span>
                  </button>
                  
                  <button 
                    onClick={() => onAddStudent({ category: 'DailyTask', status: 'Pending' })}
                    className="flex items-center gap-2 md:gap-3 h-10 md:h-12 px-3 md:px-6 bg-gradient-to-br from-emerald-500 via-purple-600 to-orange-500 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:scale-105 transition-all"
                  >
                    <Plus size={16} strokeWidth={4} /> <span className="hidden sm:inline">New Objective</span><span className="sm:hidden">Add</span>
                  </button>
                </div>
              </div>
            </div>


            {/* Filter Bar Integrated */}
            <div className="w-full flex flex-wrap items-center gap-3 py-4 border-t border-slate-300/30 shrink-0 relative z-10">
                  <div className="relative w-full sm:w-64 shrink-0">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                          type="text" 
                          placeholder="Search tasks..." 
                          className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-xl shadow-sm text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                          value={filters.searchQuery || ''}
                          onChange={e => setFilters?.({...filters, searchQuery: e.target.value})}
                      />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 sm:border-l sm:border-slate-300/30 sm:pl-4 w-full sm:w-auto">
                      <div className="relative group flex-1 sm:flex-none min-w-[120px]">
                          <select value={filters.teacher || ''} onChange={e => setFilters?.({...filters, teacher: e.target.value})} className={filterSelectStyle + " w-full"}>
                              <option value="">Categories</option>
                              {Array.from(new Set(students.filter(s => s.category === 'DailyTask').map(s => s.teachers?.split('&')?.[0]?.trim()).filter(Boolean))).sort().map(t => <option key={t as string} value={t as string}>{t as React.ReactNode}</option>)}
                          </select>
                      </div>
                      <div className="relative group flex-1 sm:flex-none min-w-[120px]">
                          <select value={filters.assistant || ''} onChange={e => setFilters?.({...filters, assistant: e.target.value})} className={filterSelectStyle + " w-full"}>
                              <option value="">Sub-Categories</option>
                              {Array.from(new Set(students.filter(s => s.category === 'DailyTask').map(s => s.assistant?.trim()).filter(Boolean))).sort().map(a => <option key={a as string} value={a as string}>{a as React.ReactNode}</option>)}
                          </select>
                      </div>
                      <div className="relative group flex-1 sm:flex-none min-w-[120px]">
                          <select value={filters.level || ''} onChange={e => setFilters?.({...filters, level: e.target.value})} className={filterSelectStyle + " w-full"}>
                              <option value="">Energy Levels</option>
                              {Array.from(new Set(students.filter(s => s.category === 'DailyTask').map(s => s.level?.trim()).filter(Boolean))).sort().map(l => <option key={l as string} value={l as string}>{l as React.ReactNode}</option>)}
                          </select>
                      </div>
                      
                      <button onClick={() => setFilters?.({...filters, searchQuery: '', level: '', time: '', teacher: '', assistant: ''})} className="p-2.5 bg-white border border-slate-200 text-slate-800 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all shadow-sm" title="Clear Filters">
                          <FilterX size={16} />
                      </button>
                  </div>
            </div>
          </>
        )}

        {/* View Switcher Overlay */}
        <div className={`w-full flex flex-col md:flex-row items-center justify-between gap-4 ${!isHeaderHidden ? 'pt-6 border-t border-white/40' : ''}`}>
           <div className="flex bg-white/40 rounded-xl md:rounded-2xl border border-white/60 p-1 backdrop-blur-md text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 w-full md:w-auto overflow-x-auto no-scrollbar">
              <button onClick={() => setViewMode('daily')} className={`flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all ${viewMode === 'daily' ? 'bg-white text-orange-600 shadow-lg' : 'hover:text-slate-800 hover:bg-white/20'}`}>Daily</button>
              <button onClick={() => setViewMode('weekly')} className={`flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all ${viewMode === 'weekly' ? 'bg-white text-orange-600 shadow-lg' : 'hover:text-slate-800 hover:bg-white/20'}`}>Weekly</button>
              <button onClick={() => setViewMode('calendar')} className={`flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-white text-orange-600 shadow-lg' : 'hover:text-slate-800 hover:bg-white/20'}`}>Calendar</button>
           </div>

           <div className="flex items-center gap-2 w-full md:w-auto justify-center">
              <div className="flex items-center bg-white/40 p-1 rounded-xl md:rounded-2xl border border-white/60 backdrop-blur-md">
                <button onClick={() => {
                    if (viewMode === 'calendar') setViewDate(subMonths(viewDate, 1));
                    else if (viewMode === 'weekly') setViewDate(subWeeks(viewDate, 1));
                    else setViewDate(addDays(viewDate, -1));
                }} className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-slate-600 hover:text-orange-600 hover:bg-white/40 rounded-lg md:rounded-xl transition-all">
                  <ChevronLeft size={18} />
                </button>
                <div className="px-3 md:px-6 text-center min-w-[140px] md:min-w-[200px]">
                  <p className="text-[10px] md:text-[12px] font-black text-slate-900 uppercase tracking-[2px] md:tracking-[3px]">
                    {viewMode === 'daily' ? format(viewDate, 'EEEE, d MMM') : viewMode === 'calendar' ? format(viewDate, 'MMMM yyyy') : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`}
                  </p>
                </div>
                <button onClick={() => {
                    if (viewMode === 'calendar') setViewDate(addMonths(viewDate, 1));
                    else if (viewMode === 'weekly') setViewDate(addWeeks(viewDate, 1));
                    else setViewDate(addDays(viewDate, 1));
                }} className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-slate-600 hover:text-orange-600 hover:bg-white/40 rounded-lg md:rounded-xl transition-all">
                  <ChevronRight size={18} />
                </button>
              </div>
           </div>

           <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={() => setShowAIChat(true)}
                className="w-9 h-9 md:w-12 md:h-12 flex items-center justify-center bg-white/40 text-slate-700 border border-white/60 rounded-xl md:rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                <MessageSquare size={18} />
              </button>
              {role === 'Admin' && (
                <button 
                  onClick={() => onClearCategory?.(['DailyTask'])}
                  className="w-9 h-9 md:w-12 md:h-12 flex items-center justify-center bg-white/40 text-slate-400 border border-white/60 rounded-xl md:rounded-2xl hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                  title="Clear All Tasks"
                >
                  <Trash2 size={18} />
                </button>
              )}
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
      <div className="flex-none md:flex-1 bg-white/[0.01] backdrop-blur-[1px] rounded-[30px] md:rounded-[40px] shadow-2xl shadow-indigo-900/10 border border-white/5 overflow-visible md:overflow-hidden flex flex-col transition-all">
        <div className="overflow-x-auto md:overflow-auto md:flex-1 custom-scrollbar">
          <table className="w-full border-separate border-spacing-0 min-w-[1000px]">
            <thead className="md:sticky top-0 z-40 bg-white shadow-sm">
              <tr className="border-b border-slate-100/30">
                <th className="w-12 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-400 border-r border-slate-100/30 md:sticky left-0 z-50 bg-white">#</th>
                <th className="w-72 px-4 py-4 text-left text-[9px] font-black uppercase text-slate-900 border-r border-slate-100/30 md:sticky left-12 z-50 bg-white">Mission Objective</th>
                <th className="w-32 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-900 border-r border-slate-100/30 bg-white">Priority</th>
                <th className="w-40 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-900 border-r border-slate-100/30 bg-white">Energy Selection</th>
                
                {days.map(day => (
                  <th key={day.toString()} className="w-32 border-r border-slate-100/30 p-0 overflow-hidden">
                    <div className={`text-center py-2.5 border-b border-slate-100/30 transition-colors ${isToday(day) ? 'bg-orange-500/10' : 'bg-slate-50/50'}`}>
                      <p className={`text-[10px] font-black ${isToday(day) ? 'text-orange-600' : 'text-slate-700'}`}>{format(day, 'EEE').toUpperCase()}</p>
                      <p className="text-[9px] font-bold text-slate-400">{format(day, 'MMM d')}</p>
                    </div>
                  </th>
                ))}
                
                <th className="w-14 px-2 py-4 text-center text-[9px] font-black uppercase text-slate-500">X</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              <AnimatePresence>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={days.length + 5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-300">
                        <ClipboardList size={40} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active objectives</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.map((s, idx) => (
                  <motion.tr 
                    key={s.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`transition-colors group h-14 bg-white/40 hover:bg-white/60`}
                  >
                    <td className="text-center text-[10px] font-black text-slate-400 border-r border-slate-100/30 md:sticky left-0 z-30 bg-white/80 backdrop-blur-md">{idx + 1}</td>
                    <td className={`px-2 border-r border-slate-100/30 md:sticky left-12 z-30 group-hover:opacity-90 transition-opacity bg-white/80 backdrop-blur-md shadow-sm`}>
                      <MultilineInput 
                        value={s.name} 
                        onChange={val => updateField(s.id, 'name', val)}
                        placeholder="Mission Objective..."
                        className="w-full h-full px-3 py-4 bg-transparent text-slate-900 text-[13px] font-black outline-none placeholder:text-slate-200"
                        style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                      />
                    </td>
                    <td className="border-r border-slate-100/30">
                      <div className="flex justify-center p-2">
                        <select 
                          value={s.priority || 'Medium'} 
                          onChange={e => updateField(s.id, 'priority', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl bg-white/40 border border-slate-200 text-[10px] font-black outline-none appearance-none uppercase transition-all hover:bg-white text-center ${s.priority === 'High' ? 'text-rose-600 bg-rose-50' : s.priority === 'Low' ? 'text-slate-500' : 'text-amber-500 bg-amber-50'}`}
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                    </td>
                    <td className="border-r border-slate-100/30 px-2">
                      <div className="flex justify-center">
                        <select 
                          value={s.level || ''} 
                          onChange={e => updateField(s.id, 'level', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/40 border border-slate-200 text-[10px] font-black text-slate-600 outline-none appearance-none uppercase text-center hover:bg-white"
                        >
                          <option value="">Select Energy</option>
                          <option value="Positive">Positive</option>
                          <option value="Negative">Negative</option>
                          <option value="Enthusiastic">Enthusiastic</option>
                          <option value="Inspired">Inspired</option>
                          <option value="Grateful">Grateful</option>
                        </select>
                      </div>
                    </td>

                    {days.map(day => {
                      const status = data.dailyTasks?.[s.id]?.[`${format(day, 'yyyy-MM-dd')}_1`];
                      
                      return (
                        <td key={day.toString()} className="border-r border-slate-100/30 p-0 overflow-hidden">
                          <div className="flex h-full min-h-[64px] p-2">
                            <button 
                              onClick={() => toggleTask(s.id, day, 1)}
                              className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-xl transition-all shadow-sm ${status === 'Done' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-50 text-slate-300 hover:bg-emerald-50 border border-slate-100'}`}
                            >
                              {status === 'Done' ? <CheckCircle2 size={12} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-slate-300"></div>}
                              <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">
                                {status || 'Pending'}
                              </span>
                            </button>
                          </div>
                        </td>
                      );
                    })}

                    <td className="text-center px-4">
                      <button onClick={() => removeEntry(s.id)} className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-300 border border-rose-100 rounded-xl hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                        <Trash size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          <div className="h-20"></div> {/* Bottom spacing for scroll */}
        </div>
      </div>
      )}
      <AIChatModal isOpen={showAIChat} onClose={() => setShowAIChat(false)} contextData={contextData} />
    </div>
  );
};
