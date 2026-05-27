import React, { useState, useEffect } from 'react';
import { RichTextDiv } from './FloatingToolbar';
import { AppData, Habit, HabitCompletion } from '../types';
import { CheckSquare, ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2, Zap, Maximize2, Minimize2, Calendar as CalendarIcon, Edit3, Target, Wand2, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, subDays, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { callNeuralEngine } from '../services/neuralEngine';

interface HabitTrackerProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
  onUpdateHabitCompletion?: (date: string, habitId: string, completed: boolean | number) => void;
  onUpdateDailyNote?: (date: string, content: string) => void;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({ data, onUpdate, onUpdateHabitCompletion, onUpdateDailyNote }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPlanningDate, setSelectedPlanningDate] = useState(new Date());
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [isNumericHabit, setIsNumericHabit] = useState(false);
  const [habitTargetValue, setHabitTargetValue] = useState<number>(2);
  const [habitUnit, setHabitUnit] = useState<string>('liters');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedHabits, setSuggestedHabits] = useState<string[]>([]);
  const [milestoneCelebration, setMilestoneCelebration] = useState<{ habitName: string; color: string; streak: number } | null>(null);

  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Ensure scroll is positioned at today on mount or month change
  useEffect(() => {
    if (tableContainerRef.current && !isFullScreen) {
      setTimeout(() => {
        const todayCell = tableContainerRef.current?.querySelector('.today-cell');
        if (todayCell && tableContainerRef.current) {
          const scrollLeft = (todayCell as HTMLElement).offsetLeft - 120;
          tableContainerRef.current.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
        }
      }, 100);
    }
  }, [currentDate, isFullScreen]);


  const habits = data.habits || [];
  const completions = data.habitCompletions || {};
  const notes = data.dailyNotes || {}; 

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const calculateStreakWithCompletions = (habitId: string, customCompletions: any) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;
    
    let currentStreak = 0;
    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');
    const yesterdayKey = format(subDays(today, 1), 'yyyy-MM-dd');
    
    const isCompletedOnDay = (dateStr: string) => {
      const comp = customCompletions[dateStr]?.[habitId];
      if (comp === undefined || comp === null) return false;
      if (habit.isNumeric) {
        return typeof comp === 'number' ? comp >= (habit.targetValue || 0) : !!comp;
      }
      return !!comp;
    };

    let dateToCheck = today;
    if (!isCompletedOnDay(todayKey)) {
      if (!isCompletedOnDay(yesterdayKey)) return 0;
      dateToCheck = subDays(today, 1);
    }
    
    let safetyLimit = 1000;
    while (safetyLimit > 0) {
      safetyLimit--;
      const dateKey = format(dateToCheck, 'yyyy-MM-dd');
      if (isCompletedOnDay(dateKey)) {
        currentStreak++;
        dateToCheck = subDays(dateToCheck, 1);
      } else {
        break;
      }
    }
    return currentStreak;
  };

  const checkAndNotifyStreak = (habitId: string, customCompletions: any) => {
    const targetHabit = habits.find(h => h.id === habitId);
    if (!targetHabit) return;
    
    const streak = calculateStreakWithCompletions(habitId, customCompletions);
    // Standard milestone thresholds: 3, 7, 14, 21, 30, 60, 100, 365
    const isMilestone = [3, 7, 14, 21, 30, 60, 100, 365].includes(streak);
    
    if (isMilestone) {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification("🏆 Habit Streak Milestone!", {
            body: `Incredible work! You reached a ${streak}-day streak for "${targetHabit.name}"!`,
          });
        } catch (e) {
          console.error("System notification error:", e);
        }
      }
      setMilestoneCelebration({
        habitName: targetHabit.name,
        color: targetHabit.color || '#f97316',
        streak
      });
    }
  };

  const handleToggleHabit = (habitId: string, day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const newCompletions = { ...completions };
    
    if (!newCompletions[dateKey]) {
      newCompletions[dateKey] = {};
    }
    
    const isCompleted = !newCompletions[dateKey][habitId];
    newCompletions[dateKey][habitId] = isCompleted;
    
    if (isCompleted && isToday(day)) {
      checkAndNotifyStreak(habitId, newCompletions);
    }

    if (onUpdateHabitCompletion) {
      onUpdateHabitCompletion(dateKey, habitId, isCompleted);
    } else {
      onUpdate({ ...data, habitCompletions: newCompletions });
    }
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    
    // Aesthetic orange/green centric colors
    const colors = ['#f97316', '#22c55e', '#fb923c', '#4ade80', '#ea580c', '#16a34a'];
    const habitColor = colors[habits.length % colors.length];
    
    const newHabit: Habit = {
      id: uuidv4(),
      name: newHabitName.trim(),
      order: habits.length,
      color: habitColor,
      isNumeric: isNumericHabit,
      targetValue: isNumericHabit ? habitTargetValue : undefined,
      unit: isNumericHabit ? habitUnit.trim() : undefined
    };
    
    onUpdate({ ...data, habits: [...habits, newHabit] });
    setNewHabitName('');
    setIsNumericHabit(false);
    setHabitTargetValue(2);
    setHabitUnit('liters');
    setIsAddingHabit(false);
  };

  const handleDeleteHabit = (id: string) => {
    if (window.confirm('Delete this habit and all its history?')) {
      onUpdate({
        ...data,
        habits: habits.filter(h => h.id !== id)
      });
    }
  };

  const isHabitCompletedOnDay = (habit: Habit | undefined, dateKey: string): boolean => {
    if (!habit) return false;
    const comp = completions[dateKey]?.[habit.id];
    if (comp === undefined || comp === null) return false;
    if (habit.isNumeric) {
      const target = habit.targetValue || 0;
      return typeof comp === 'number' ? comp >= target : !!comp;
    }
    return !!comp;
  };

  const adjustNumericValue = (habitId: string, day: Date, amount: number) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const newCompletions = { ...completions };
    
    if (!newCompletions[dateKey]) {
      newCompletions[dateKey] = {};
    }
    
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    
    const currentVal = typeof newCompletions[dateKey][habitId] === 'number' 
      ? (newCompletions[dateKey][habitId] as number) 
      : (newCompletions[dateKey][habitId] ? (habit.targetValue || 1) : 0);
      
    let newVal = Math.max(0, currentVal + amount);
    newVal = Math.round(newVal * 10) / 10;
    
    newCompletions[dateKey][habitId] = newVal;
    
    // Check if it crosses target completion
    const target = habit.targetValue || 0;
    const isCompletedNow = newVal >= target;
    const wasCompletedBefore = currentVal >= target;
    
    if (isCompletedNow && !wasCompletedBefore && isToday(day)) {
      checkAndNotifyStreak(habitId, newCompletions);
    }
    
    if (onUpdateHabitCompletion) {
      onUpdateHabitCompletion(dateKey, habitId, newVal);
    } else {
      onUpdate({ ...data, habitCompletions: newCompletions });
    }
  };

  const getStreak = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;
    
    let currentStreak = 0;
    const today = new Date();
    
    // Check if missed yesterday and today. If so, streak is 0.
    const todayKey = format(today, 'yyyy-MM-dd');
    const yesterdayKey = format(subDays(today, 1), 'yyyy-MM-dd');
    
    let dateToCheck = today;
    
    // If today is not completed, check if yesterday was. If neither, streak is 0.
    if (!isHabitCompletedOnDay(habit, todayKey)) {
      if (!isHabitCompletedOnDay(habit, yesterdayKey)) {
        return 0;
      }
      dateToCheck = subDays(today, 1);
    }
    
    let safetyLimit = 1000;
    while (safetyLimit > 0) {
      safetyLimit--;
      const dateKey = format(dateToCheck, 'yyyy-MM-dd');
      if (isHabitCompletedOnDay(habit, dateKey)) {
        currentStreak++;
        dateToCheck = subDays(dateToCheck, 1);
      } else {
        break;
      }
    }
    return currentStreak;
  };

  const getAISuggestions = async () => {
    if (isSuggesting) return;
    setIsSuggesting(true);
    setSuggestedHabits([]);

    const existingHabits = habits.map(h => h.name).join(', ');
    const recentNotes = Object.values(notes).slice(-5).join('\n');
    const performance = habits.map(h => `${h.name}: ${getStreak(h.id)} day streak`).join(', ');

    const prompt = `Based on my current habits: [${existingHabits}], my recent journal entries: [${recentNotes}], and my performance: [${performance}], suggest 3 new habits that would complement my growth. 
    Format: Return ONLY a JSON array of strings, e.g., ["Meditate for 10 min", "Drink 2L water", "Read 5 pages"]. No other text.`;

    try {
      const result = await callNeuralEngine(
        'gemini-3-flash-preview',
        prompt,
        "You are an expert life optimizer and habit coach. Focus on complementary habits for holistic growth."
      );
      
      // Try to parse the JSON array
      const cleaned = result.text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        setSuggestedHabits(parsed);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to get AI suggestions.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const applySuggestedHabit = (name: string) => {
    const colors = ['#f97316', '#22c55e', '#fb923c', '#4ade80', '#ea580c', '#16a34a'];
    const habitColor = colors[habits.length % colors.length];
    
    const newHabit: Habit = {
      id: uuidv4(),
      name: name,
      order: habits.length,
      color: habitColor
    };
    
    onUpdate({ ...data, habits: [...habits, newHabit] });
    setSuggestedHabits(prev => prev.filter(h => h !== name));
  };

  if (isFullScreen) {
    return (
      <div className="flex-1 flex flex-col p-4 md:p-8 lg:p-12 overflow-y-auto bg-transparent font-sans relative">
        <div className="w-full bg-white/70 backdrop-blur-3xl rounded-[32px] p-6 md:p-10 border border-white/20 shadow-2xl">
          {/* Full Screen Header */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-black/10">
             <h2 className="text-2xl md:text-5xl font-black text-slate-800 tracking-tighter uppercase italic flex items-center gap-4">
                <CalendarIcon style={{ color: data.settings?.dateTextColor || '#ea580c' }} size={32} />
                Monthly Planner
             </h2>
             <button 
              onClick={() => setIsFullScreen(false)}
              className="p-3 md:p-4 bg-slate-900 text-white rounded-2xl hover:bg-orange-600 transition-all shadow-xl flex items-center justify-center shrink-0"
             >
                <Minimize2 size={24} />
             </button>
          </div>

          {/* Top Planning Board */}
          <div className="mb-8">
             <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl -mr-16 -mt-16"></div>
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                          <Edit3 size={18} />
                      </div>
                      <div>
                          <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">Architecture of Resolve</p>
                          <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-3">
                              {format(selectedPlanningDate, 'MMMM do, yyyy')}
                              <button onClick={() => { 
                                const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul>`; 
                                const dateKey = format(selectedPlanningDate, 'yyyy-MM-dd'); 
                                let safeVal = notes[dateKey] || ''; 
                                if (typeof safeVal !== 'string' || safeVal === '[object Object]') safeVal = ''; 
                                const newNote = safeVal + html; 
                                if (onUpdateDailyNote) { 
                                  onUpdateDailyNote(dateKey, newNote); 
                                } else { 
                                  onUpdate({ ...data, dailyNotes: { ...(data.dailyNotes || {}), [dateKey]: newNote } }); 
                                } 
                              }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={20} /></button>
                          </h3>
                      </div>
                   </div>
                </div>
                <RichTextDiv 
                    value={notes[format(selectedPlanningDate, 'yyyy-MM-dd')] || ''}
                    onChange={(val) => {
                      const dateKey = format(selectedPlanningDate, 'yyyy-MM-dd');
                      if (onUpdateDailyNote) {
                        onUpdateDailyNote(dateKey, val);
                      } else {
                        onUpdate({ ...data, dailyNotes: { ...(data.dailyNotes || {}), [dateKey]: val } });
                      }
                    }}
                    className="w-full h-24 bg-white rounded-2xl p-4 text-slate-800 font-bold text-lg outline-none border border-slate-200 focus:border-orange-500 transition-all placeholder:text-slate-400 overflow-y-auto overflow-x-hidden shadow-inner block"
                    placeholder="Define your focus..."
                />
             </div>
          </div>

          {/* 30 Day Grid View */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 pb-10">
            {daysInMonth.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const isSel = isSameDay(day, selectedPlanningDate);
              const dailyCompletions = habits.reduce((acc, h) => acc + (isHabitCompletedOnDay(h, dateKey) ? 1 : 0), 0);
              const dayNote = notes[dateKey];
              
              return (
                <motion.div
                  key={day.toString()}
                  whileHover={{ y: -3, backgroundColor: 'rgba(0,0,0,0.02)' }}
                  onClick={() => setSelectedPlanningDate(day)}
                  className={`aspect-square rounded-[24px] p-4 cursor-pointer border transition-all relative overflow-hidden flex flex-col justify-between ${isSel ? 'border-orange-500 bg-white shadow-xl scale-[1.05] z-10' : 'border-slate-200/60 bg-slate-50/50 backdrop-blur-md shadow-sm'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-lg font-black ${isToday(day) ? 'text-orange-600 underline decoration-orange-600/30' : 'text-slate-800 opacity-65'}`}>
                      {format(day, 'd')}
                    </span>
                    <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">
                      {format(day, 'EEE')}
                    </span>
                  </div>

                  <div className="flex-1 mt-1.5 overflow-hidden pointer-events-none min-h-[44px] max-h-[64px] text-[9px] text-slate-700 leading-tight">
                    {dayNote && (
                      <div 
                        className="line-clamp-3 overflow-hidden text-[9px] mini-planner-note select-none text-left" 
                        dangerouslySetInnerHTML={{ __html: dayNote }} 
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    {dailyCompletions > 0 && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500 text-white rounded-lg">
                        <CheckCircle2 size={8} strokeWidth={4} />
                        <span className="text-[7px] font-black uppercase tracking-tighter">{dailyCompletions}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen p-4 md:p-8 overflow-y-auto bg-transparent font-sans">


      {/* Main View Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-6 shrink-0">
        <div className="relative group flex items-center gap-6">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic drop-shadow-sm flex items-center gap-3">
            <Target className="text-orange-600" size={28} />
            Performance Mastery Hub
          </h1>
          
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-3xl rounded-full p-1 border border-white/20">
            <button 
              onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
              className="p-2 hover:bg-white/20 rounded-full transition-all text-slate-900"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="px-4 text-center group/year cursor-pointer relative" onClick={() => {
              const year = prompt('Enter Year:', format(currentDate, 'yyyy'));
              if (year && !isNaN(parseInt(year))) {
                const newDate = new Date(currentDate);
                newDate.setFullYear(parseInt(year));
                setCurrentDate(newDate);
              }
            }}>
               <span className="block text-[8px] font-black uppercase leading-none mb-1 tracking-widest group-hover/year:scale-110 transition-transform" style={{ color: data.settings?.dateTextColor || '#ea580c' }}>{format(currentDate, 'yyyy')}</span>
               <span className="block text-sm font-black text-slate-800 leading-none">{format(currentDate, 'MMMM')}</span>
            </div>
            <button 
              onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
              className="p-2 hover:bg-white/20 rounded-full transition-all text-slate-900"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center">
          <button 
            onClick={getAISuggestions}
            disabled={isSuggesting}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 md:px-7 py-3 md:py-4 rounded-2xl font-black text-[10px] md:text-xs tracking-widest hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all shadow-xl disabled:opacity-50 uppercase"
          >
            {isSuggesting ? <RefreshCw size={16} className="animate-spin" /> : <Wand2 size={16} />}
            AI Suggestions
          </button>
          <button 
            onClick={() => setIsFullScreen(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 md:px-7 py-3 md:py-4 rounded-2xl font-black text-[10px] md:text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-xl uppercase"
          >
            <Maximize2 size={16} strokeWidth={3} /> Monthly Planner
          </button>
          <button 
            onClick={() => setIsAddingHabit(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-orange-600 to-orange-400 text-white px-5 md:px-7 py-3 md:py-4 rounded-2xl font-black text-[10px] md:text-xs tracking-widest hover:shadow-orange-500/40 hover:-translate-y-1 transition-all shadow-xl shadow-orange-600/20 uppercase"
          >
            <Plus size={18} strokeWidth={3} /> Mastery Access
          </button>
        </div>
      </div>

      {/* AI Suggestions Dropdown/Panel */}
      <AnimatePresence>
        {suggestedHabits.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[24px] p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-black text-slate-800 uppercase italic flex items-center gap-2">
                 <Wand2 size={16} className="text-indigo-500" />
                 AI Master Recommendations
               </h3>
               <button onClick={() => setSuggestedHabits([])} className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 transition-colors tracking-widest">Clear</button>
            </div>
            <div className="flex flex-wrap gap-3">
              {suggestedHabits.map((h, i) => (
                <button 
                  key={i}
                  onClick={() => applySuggestedHabit(h)}
                  className="px-4 py-2 bg-white/40 hover:bg-white/60 border border-white/20 rounded-xl text-xs font-bold text-slate-800 transition-all flex items-center gap-2 group"
                >
                  <Plus size={14} className="text-indigo-500 group-hover:scale-125 transition-transform" />
                  {h}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Master Planning Architecture - Compact Hero */}
      <div className={`mb-8 ${isFullScreen ? 'hidden' : 'space-y-6'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Note input at the top as requested */}
          <div className="lg:col-span-8 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[24px] p-6 shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                      <Edit3 size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-2">
                        Strategic Planning 
                        <button onClick={() => { 
                          const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul>`; 
                          const dateKey = format(selectedPlanningDate, 'yyyy-MM-dd'); 
                          let safeVal = notes[dateKey] || ''; 
                          if (typeof safeVal !== 'string' || safeVal === '[object Object]') safeVal = ''; 
                          const newNote = safeVal + html; 
                          if (onUpdateDailyNote) { 
                            onUpdateDailyNote(dateKey, newNote); 
                          } else { 
                            onUpdate({ ...data, dailyNotes: { ...(data.dailyNotes || {}), [dateKey]: newNote } }); 
                          } 
                        }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button>
                      </h3>
                      <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest leading-none">{format(selectedPlanningDate, 'MMMM do, yyyy')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {eachDayOfInterval({ 
                      start: subDays(selectedPlanningDate, 3), 
                      end: endOfWeek(selectedPlanningDate, { weekStartsOn: 1 })
                    }).slice(0, 7).map(day => (
                      <button 
                        key={day.toString()}
                        onClick={() => setSelectedPlanningDate(day)}
                        className={`w-10 h-10 rounded-xl text-[9px] font-black transition-all flex flex-col items-center justify-center ${isSameDay(day, selectedPlanningDate) ? 'bg-orange-600 text-white shadow-lg' : 'bg-white/10 text-slate-600 hover:bg-white/30'}`}
                      >
                        <span>{format(day, 'd')}</span>
                        <span className="text-[6px] opacity-60 uppercase">{format(day, 'EEE')[0]}</span>
                      </button>
                    ))}
                  </div>
              </div>
              <RichTextDiv 
                 value={notes[format(selectedPlanningDate, 'yyyy-MM-dd')] || ''}
                 onChange={(val) => {
                   const dateKey = format(selectedPlanningDate, 'yyyy-MM-dd');
                   if (onUpdateDailyNote) {
                     onUpdateDailyNote(dateKey, val);
                   } else {
                     onUpdate({ ...data, dailyNotes: { ...(data.dailyNotes || {}), [dateKey]: val } });
                   }
                 }}
                 placeholder={`Mission goals for tomorrow...`}
                 className="w-full h-20 bg-white/5 rounded-xl p-4 text-slate-800 font-bold text-sm outline-none border border-transparent focus:border-orange-500/30 transition-all placeholder:text-slate-400 overflow-y-auto block"
              />
          </div>

          <div className="lg:col-span-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[24px] p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 italic">
                  <Zap size={14} /> Weekly Insight
                </h4>
                <div 
                  className="text-[10px] font-bold text-slate-500 line-clamp-3 overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: data.reflections?.weeklyReview?.content || "Synchronize your objectives for peak efficiency." }}
                />
              </div>
          </div>
        </div>
      </div>

      <div className={`w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden mt-6 flex flex-col ${isFullScreen ? 'hidden' : ''}`}>
        <div ref={tableContainerRef} className="overflow-x-auto custom-scrollbar-orange relative">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/5 text-slate-900 backdrop-blur-md">
                <th className="sticky left-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 md:p-8 text-left border-b border-slate-200/50 w-64 md:w-72 min-w-[240px] md:min-w-[288px] shadow-[2px_0_10px_rgba(0,0,0,0.08)]">
                  <span className="text-[10px] font-black uppercase tracking-[4px] text-orange-600">Mastery Disciplines</span>
                </th>
                {daysInMonth.map(day => (
                  <th key={day.toString()} className={`p-4 md:p-6 border-b border-slate-200/50 min-w-[60px] md:min-w-[72px] text-center ${isToday(day) ? 'bg-orange-500 text-white font-black shadow-lg shadow-orange-500/30 rounded-b-2xl today-cell' : 'hover:bg-slate-100/50 transition-colors'}`}>
                    <span className="text-[9px] font-black uppercase block mb-0.5 opacity-60 tracking-wider ">{format(day, 'EEE')}</span>
                    <span className="text-xs font-black tracking-tight">{format(day, 'd')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {habits.map((habit, idx) => {
                const streak = getStreak(habit.id);
                return (
                 <tr key={habit.id} className="group hover:bg-black/5 transition-colors">
                    <td className="sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 border-b border-black/10 min-w-[240px] md:min-w-[288px] shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
                     <div className="flex items-center justify-between gap-4">
                       <div className="flex flex-col gap-1 min-w-0">
                         <RichTextDiv 
                           tagName="span"
                           className="text-sm font-black text-black uppercase tracking-tight" 
                           style={{ color: habit.color || 'black' }}
                           value={habit.name}
                           onChange={(val) => {
                             const newHabits = data.habits.map(h => h.id === habit.id ? { ...h, name: val } : h);
                             onUpdate({ ...data, habits: newHabits });
                           }}
                         />
                         {streak > 0 && (
                           <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1.5" style={{ color: habit.color }}>
                               <Zap size={14} className="animate-pulse" />
                               <span className="text-xs font-bold">{streak} Day Streak</span>
                             </div>
                             {streak >= 100 ? (
                               <div className="px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-700 text-[10px] font-black uppercase shadow-sm border border-yellow-400/30 flex items-center gap-1 shadow-yellow-400/10" title="100+ Day Streak">
                                  <span className="text-[10px]">👑</span> Centurion
                               </div>
                             ) : streak >= 30 ? (
                               <div className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 text-[10px] font-black uppercase shadow-sm border border-purple-500/20 flex items-center gap-1" title="30+ Day Streak">
                                  <span className="text-[10px]">🏆</span> Champion
                               </div>
                             ) : streak >= 7 ? (
                               <div className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-black uppercase shadow-sm border border-orange-500/20 flex items-center gap-1" title="7+ Day Streak">
                                  <span className="text-[10px]">🔥</span> On Fire
                               </div>
                             ) : null}
                           </div>
                         )}
                       </div>
                       <button 
                         onClick={() => handleDeleteHabit(habit.id)}
                         className="opacity-0 group-hover:opacity-100 p-2 text-black/30 hover:text-red-600 transition-all rounded-lg shrink-0"
                       >
                         <Trash2 size={14} />
                       </button>
                     </div>
                   </td>
                  {daysInMonth.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    
                    if (habit.isNumeric) {
                      const progressVal = typeof completions[dateKey]?.[habit.id] === 'number' 
                        ? (completions[dateKey]?.[habit.id] as number) 
                        : (completions[dateKey]?.[habit.id] ? (habit.targetValue || 1) : 0);
                      const isFullDone = progressVal >= (habit.targetValue || 0);

                      return (
                        <td key={day.toString()} className="p-2 border-b border-black/10 text-center">
                          <div className="flex flex-col items-center justify-center gap-1 select-none w-16 mx-auto">
                            <span className="text-[8px] font-black text-slate-400 tracking-tighter leading-none mb-0.5" style={{ color: isFullDone ? (habit.color || '#10b981') : '' }}>
                              {isFullDone ? '✅ DONE' : '🏃 GOAL'}
                            </span>
                            <div className="flex items-center gap-1 bg-white/40 border border-slate-200/50 p-1 rounded-full shadow-sm">
                              <button 
                                onClick={() => adjustNumericValue(habit.id, day, -0.5)}
                                onDoubleClick={(e) => { e.stopPropagation(); adjustNumericValue(habit.id, day, -1); }}
                                className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-250 text-[10px] font-black flex items-center justify-center cursor-pointer border border-slate-200/60"
                                title="Subtract 0.5 (Double-click: -1)"
                              >
                                -
                              </button>
                              
                              <div 
                                onClick={() => adjustNumericValue(habit.id, day, isFullDone ? -progressVal : (habit.targetValue || 2) - progressVal)}
                                className={`px-1.5 py-0.5 rounded-full text-[9px] font-black cursor-pointer transition-all ${
                                  isFullDone
                                    ? 'text-white font-extrabold shadow-sm'
                                    : 'text-slate-700 hover:bg-slate-100'
                                }`}
                                style={{
                                  backgroundColor: isFullDone ? (habit.color || '#ea580c') : '',
                                  border: `1px solid ${habit.color || '#ea580c'}40`
                                }}
                                title="Click to auto-adjust to goal magnitude"
                              >
                                {progressVal}
                              </div>

                              <button 
                                onClick={() => adjustNumericValue(habit.id, day, 0.5)}
                                onDoubleClick={(e) => { e.stopPropagation(); adjustNumericValue(habit.id, day, 1); }}
                                className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-250 text-[10px] font-black flex items-center justify-center cursor-pointer border border-slate-200/60"
                                title="Add 0.5 (Double-click: +1)"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none truncate max-w-[55px] mt-0.5">
                              {habit.targetValue} {habit.unit || 'units'}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    const isCompleted = !!completions[dateKey]?.[habit.id];
                    return (
                      <td key={day.toString()} className="p-4 border-b border-black/10 text-center">
                        <button 
                          onClick={() => handleToggleHabit(habit.id, day)}
                          className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                            isCompleted 
                              ? 'scale-110 shadow-lg' 
                              : 'bg-black/5 text-transparent hover:bg-black/10'
                          }`}
                          style={{ 
                            backgroundColor: isCompleted ? (habit.color || '#10b981') : '',
                            color: 'white',
                            boxShadow: isCompleted ? `0 0 15px ${(habit.color || '#10b981')}44` : ''
                          }}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
                );
              })}
              {habits.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth.length + 1} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4 text-white/10">
                      <Zap size={64} strokeWidth={1} />
                      <p className="font-black text-[10px] uppercase tracking-[0.2em] italic opacity-40">No habits tracking yet. Click "Add Mastery" to start.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Styled scrollbar and planning checklist css */}
      <style>{`
        .custom-scrollbar-orange::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }
        .custom-scrollbar-orange::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 5px;
        }
        .custom-scrollbar-orange::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.3);
          border-radius: 5px;
          border: 2px solid rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar-orange::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.5);
        }
        .mini-planner-note ul {
          list-style-type: none !important;
          padding-left: 0 !important;
          margin: 0 !important;
        }
        .mini-planner-note li {
          display: flex !important;
          align-items: flex-start !important;
          gap: 4px !important;
          margin: 1px 0 !important;
          padding: 0 !important;
          font-size: 8px !important;
          line-height: 1.15 !important;
        }
        .mini-planner-note .task-checkbox {
          font-size: 8px !important;
        }
      `}</style>

      <AnimatePresence>
        {isAddingHabit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-[32px] p-6 md:p-10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight">New Mastery Habit</h3>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Habit Name</label>
                  <input 
                    autoFocus
                    type="text"
                    value={newHabitName}
                    onChange={e => setNewHabitName(e.target.value)}
                    placeholder="e.g., Drink water"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-base font-bold outline-none focus:border-indigo-500 transition-all"
                    onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-4">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsNumericHabit(!isNumericHabit)}>
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight block">Numerical Goal?</span>
                      <span className="text-[9px] text-slate-400 font-bold block">Track counts or levels (e.g. 2 liters of water)</span>
                    </div>
                    <button 
                      type="button"
                      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${isNumericHabit ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all ${isNumericHabit ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {isNumericHabit && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/50"
                    >
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Daily Target</label>
                        <input 
                          type="number"
                          value={habitTargetValue}
                          onChange={e => setHabitTargetValue(Math.max(0.1, parseFloat(e.target.value) || 1))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                          min="0.1"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Unit</label>
                        <input 
                          type="text"
                          value={habitUnit}
                          onChange={e => setHabitUnit(e.target.value)}
                          placeholder="e.g. liters, pages, reps"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsAddingHabit(false)}
                  className="flex-1 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddHabit}
                  className="flex-1 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Create Habit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {/* Milestone Celebration Overlay Pop-up Modal */}
        {milestoneCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none overflow-hidden"
          >
            {/* Visual Confetti / Glitter elements */}
            <div className="absolute inset-0 pointer-events-none opacity-30">
              <div className="absolute w-[500px] h-[500px] bg-orange-500/10 rounded-full filter blur-3xl animate-pulse top-0 left-10"></div>
              <div className="absolute w-[600px] h-[600px] bg-emerald-500/10 rounded-full filter blur-3xl animate-pulse bottom-0 right-10"></div>
            </div>

            <motion.div 
              initial={{ scale: 0.85, y: 50, rotate: -2 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.85, y: 50, rotate: 2 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-white rounded-[40px] border border-slate-200 p-8 md:p-12 shadow-2xl max-w-lg w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-3" style={{ backgroundColor: milestoneCelebration.color }}></div>
              
              {/* Floating trophy / sparkles inside a circle */}
              <div 
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-current/30 animate-bounce"
                style={{ backgroundColor: milestoneCelebration.color }}
              >
                <Zap size={44} strokeWidth={3} />
              </div>

              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] block mb-2">Milestone Unlocked</span>
              
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-4">
                {milestoneCelebration.streak}-DAY STREAK!
              </h3>
              
              <p className="text-slate-600 font-bold text-base leading-relaxed mb-8 max-w-sm mx-auto">
                Insane dedication! You've maintained your habit <span className="font-black italic px-2 py-0.5 rounded-lg bg-slate-100 text-slate-900">"{milestoneCelebration.habitName}"</span> for {milestoneCelebration.streak} days straight! This architecture of resolve is paying off.
              </p>

              <button
                type="button"
                onClick={() => setMilestoneCelebration(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-xl hover:scale-[1.03] active:scale-95 transition-all"
              >
                Let's Keep Dominating
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
