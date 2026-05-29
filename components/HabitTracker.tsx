import React, { useState, useEffect, useMemo } from 'react';
import { RichTextDiv } from './FloatingToolbar';
import { AppData, Habit, HabitCompletion } from '../types';
import { CheckSquare, ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2, Zap, Maximize2, Minimize2, Calendar as CalendarIcon, Edit3, Target, Wand2, RefreshCw, X, Download, MessageSquare } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, subDays, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { VariableSizeList as List } from 'react-window';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import html2pdf from 'html2pdf.js';
import { callNeuralEngine } from '../services/neuralEngine';
import { ConfettiOverlay } from './ConfettiOverlay';

interface HabitTrackerProps {
  data: AppData;
  onUpdate: (newDataOrUpdater: AppData | ((prev: AppData) => AppData)) => void;
  onUpdateHabitCompletion?: (date: string, habitId: string, completed: boolean | number) => void;
  onUpdateDailyNote?: (date: string, content: string) => void;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({ data, onUpdate, onUpdateHabitCompletion, onUpdateDailyNote }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPlanningDate, setSelectedPlanningDate] = useState(new Date());
  const [streakMilestoneEvent, setStreakMilestoneEvent] = useState<{streak: number, habitName: string} | null>(null);
  const [newHabitCategory, setNewHabitCategory] = useState<string>('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [isResettingWeek, setIsResettingWeek] = useState(false);
  const [resetTargetCategory, setResetTargetCategory] = useState('General');
  const [newHabitName, setNewHabitName] = useState('');
  const [isNumericHabit, setIsNumericHabit] = useState(false);
  const [habitTargetValue, setHabitTargetValue] = useState<number>(2);
  const [habitUnit, setHabitUnit] = useState<string>('liters');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedHabits, setSuggestedHabits] = useState<string[]>([]);
  const [milestoneCelebration, setMilestoneCelebration] = useState<{ habitName: string; color: string; streak: number } | null>(null);

  const [editingNoteState, setEditingNoteState] = useState<{
    habitId: string;
    habitName: string;
    habitColor?: string;
    date: string;
    noteText: string;
  } | null>(null);

  const openNoteDialog = (habit: Habit, dateStr: string) => {
    const existingNote = data.habitNotes?.[dateStr]?.[habit.id] || '';
    setEditingNoteState({
      habitId: habit.id,
      habitName: habit.name,
      habitColor: habit.color,
      date: dateStr,
      noteText: existingNote
    });
  };

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
    const isCompletedNow = !completions[dateKey]?.[habitId];

    // Optimistic UI check feedback animation
    const target = document.querySelector(`[data-habit-id="${habitId}"][data-date="${dateKey}"]`);
    if (target) {
      target.classList.add('scale-75');
      setTimeout(() => target.classList.remove('scale-75'), 200);
    }

    if (onUpdateHabitCompletion) {
      onUpdateHabitCompletion(dateKey, habitId, isCompletedNow);
    } else {
      onUpdate((prev: AppData) => {
        const currentCompletions = prev.habitCompletions || {};
        const dayCompletions = { ...(currentCompletions[dateKey] || {}) };
        dayCompletions[habitId] = isCompletedNow;
        return { ...prev, habitCompletions: { ...currentCompletions, [dateKey]: dayCompletions } };
      });
    }

    if (isCompletedNow && isToday(day)) {
      // Create a temporary completion object for streak check notification
      const tempCompletions = { ...completions, [dateKey]: { ...(completions[dateKey] || {}), [habitId]: true } };
      checkAndNotifyStreak(habitId, tempCompletions);
    }
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    
    // Aesthetic orange/green centric colors
    const colors = ['#f97316', '#22c55e', '#fb923c', '#4ade80', '#ea580c', '#16a34a'];
    
    onUpdate((prev: AppData) => {
      const currentHabits = prev.habits || [];
      const habitColor = colors[currentHabits.length % colors.length];
      const newHabit: Habit = {
        id: uuidv4(),
        name: newHabitName.trim(),
        order: currentHabits.length,
        color: habitColor,
        isNumeric: isNumericHabit,
        targetValue: isNumericHabit ? habitTargetValue : undefined,
        unit: isNumericHabit ? habitUnit.trim() : undefined,
        category: newHabitCategory.trim() || 'General'
      };
      return { ...prev, habits: [...currentHabits, newHabit] };
    });

    setNewHabitName('');
    setNewHabitCategory('');
    setIsNumericHabit(false);
    setHabitTargetValue(2);
    setHabitUnit('liters');
    setIsAddingHabit(false);
  };

  const handleDeleteHabit = (id: string) => {
    if (window.confirm('Delete this habit and all its history?')) {
      onUpdate((prev: AppData) => ({
        ...prev,
        habits: (prev.habits || []).filter(h => h.id !== id)
      }));
    }
  };

  const handleExportCSV = () => {
    if (habits.length === 0) {
      alert("No habits available to export.");
      return;
    }

    const csvRows: string[] = [];
    csvRows.push("Habit Tracker Mastery - 30-Day Completion History Ledger");
    csvRows.push(`Exported on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`);
    csvRows.push("");

    // 1. Habit Completion Summary section
    csvRows.push("HABIT SUMMARY STATUS");
    csvRows.push("Habit Name,Current Streak,Habit Type,Target Goal,Unit,Days Completed (Out of 30),Achievement Rate (%)");

    const last30Days: Date[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      last30Days.push(subDays(today, i));
    }

    habits.forEach(habit => {
      let completedCount = 0;
      last30Days.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        if (isHabitCompletedOnDay(habit, dateKey)) {
          completedCount++;
        }
      });

      const streak = getStreak(habit.id);
      const habitType = habit.isNumeric ? "Numeric" : "Checkbox";
      const targetGoal = habit.isNumeric ? (habit.targetValue || 0) : "N/A";
      const unit = habit.isNumeric ? (habit.unit || "units") : "N/A";
      const achievementRate = ((completedCount / 30) * 100).toFixed(1);

      const nameEscaped = habit.name.replace(/"/g, '""');
      csvRows.push(`"${nameEscaped}",${streak},${habitType},"${targetGoal}","${unit}",${completedCount},${achievementRate}%`);
    });

    csvRows.push("");
    csvRows.push("DETAILED COMPLETED LOG (LAST 30 DAYS)");
    csvRows.push("Date,Day of Week,Habit Name,Habit Type,Value/Status,Target Goal,Achieved (Yes/No)");

    last30Days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayOfWeek = format(day, 'EEEE');

      habits.forEach(habit => {
        const isCompleted = isHabitCompletedOnDay(habit, dateKey);
        const compVal = completions[dateKey]?.[habit.id];
        
        let valueStr = "No";
        if (habit.isNumeric) {
          valueStr = compVal !== undefined && compVal !== null ? String(compVal) : "0";
        } else {
          valueStr = compVal ? "Yes" : "No";
        }

        const habitType = habit.isNumeric ? "Numeric" : "Checkbox";
        const targetGoal = habit.isNumeric ? (habit.targetValue || 0) : "N/A";
        const achievedStr = isCompleted ? "Yes" : "No";
        const nameEscaped = habit.name.replace(/"/g, '""');

        csvRows.push(`${dateKey},${dayOfWeek},"${nameEscaped}",${habitType},"${valueStr}","${targetGoal}",${achievedStr}`);
      });
    });

    const blob = new Blob(['\ufeff' + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Habit_Tracker_30_Day_Mastery_Export_${format(today, 'yyyyMMdd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const handleExportPDF = () => {
    const element = document.getElementById('habit-tracker-full-report-target');
    if (!element) return;
    
    // Temporarily show the report for capture
    element.style.display = 'block';
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Performance_Mastery_Hub_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 3, useCORS: true, logging: false, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true }
    };
    
    // @ts-ignore
    html2pdf().from(element).set(opt).save().then(() => {
      element.style.display = 'none';
      setIsAddingHabit(false); // Close any open modal just in case
    });
  };

  const streakData = useMemo(() => {
    const last90Days = Array.from({ length: 90 }, (_, i) => subDays(new Date(), 89 - i));
    return last90Days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayCompletions = (data.habits || []).reduce((acc, h) => {
        const comp = (data.habitCompletions || {})[dateKey]?.[h.id];
        if (comp === undefined || comp === null) return acc;
        if (h.isNumeric) {
          return acc + (typeof comp === 'number' && comp >= (h.targetValue || 0) ? 1 : 0);
        }
        return acc + (comp ? 1 : 0);
      }, 0);
      return {
        date: format(day, 'MMM d'),
        fullDate: dateKey,
        completions: dayCompletions,
      };
    });
  }, [data.habits, data.habitCompletions]);

  const groupedHabits = useMemo(() => {
    const groups: Record<string, Habit[]> = {};
    (data.habits || []).forEach(h => {
      const cat = h.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(h);
    });
    return groups;
  }, [data.habits]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleResetCategoryWeek = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    
    onUpdate((prev: AppData) => {
      const newCompletions = { ...prev.habitCompletions };
      const habitsInCat = (prev.habits || []).filter(h => (h.category || 'General') === resetTargetCategory);
      
      if (habitsInCat.length === 0) return prev;

      days.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        if (newCompletions[dateKey]) {
          const dayComps = { ...newCompletions[dateKey] };
          let changed = false;
          habitsInCat.forEach(h => {
            if (dayComps[h.id] !== undefined) {
              delete dayComps[h.id];
              changed = true;
            }
          });
          
          if (changed) {
            if (Object.keys(dayComps).length === 0) {
              delete newCompletions[dateKey];
            } else {
              newCompletions[dateKey] = dayComps;
            }
          }
        }
      });
      
      return { ...prev, habitCompletions: newCompletions };
    });
    setIsResettingWeek(false);
  };

  const flattenedItems = useMemo(() => {
    const list: any[] = [];
    Object.keys(groupedHabits).sort().forEach(cat => {
      list.push({ type: 'header', name: cat });
      if (!collapsedCategories[cat]) {
        groupedHabits[cat].forEach(habit => {
          list.push({ type: 'habit', habit });
        });
      }
    });
    return list;
  }, [groupedHabits, collapsedCategories]);

  const getItemSize = (index: number) => {
    return flattenedItems[index].type === 'header' ? 44 : 92;
  };

  const Row = ({ index, style }: { index: number, style: any }) => {
    const item = flattenedItems[index];

    if (item.type === 'header') {
      const isCollapsed = collapsedCategories[item.name];
      return (
        <div 
          style={style} 
          className="bg-zinc-100/80 backdrop-blur-md border-y border-zinc-200/50 px-8 py-2 flex items-center justify-between sticky left-0 z-20 cursor-pointer hover:bg-zinc-200 transition-colors"
          onClick={() => toggleCategory(item.name)}
        >
           <div className="flex items-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-[4px] text-orange-600/40">Grouping</span>
              <h4 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{item.name}</h4>
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{groupedHabits[item.name].length} Mastery Disciplines</span>
              <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }}>
                 <ChevronRight size={16} />
              </motion.div>
           </div>
        </div>
      );
    }

    const { habit } = item;
    const streak = getStreak(habit.id);

    return (
      <div style={style} className="group hover:bg-black/5 transition-colors border-b border-zinc-100 flex items-center overflow-visible">
         <div className="sticky left-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-3 md:p-6 border-r border-black/10 w-[240px] shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.05)] h-full flex flex-col justify-center">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5 min-w-0 overflow-hidden">
                <span className="text-sm font-black uppercase tracking-tight truncate" style={{ color: habit.color || 'black' }}>{habit.name}</span>
                {streak > 0 && (
                  <div className="flex items-center gap-1.5" style={{ color: habit.color }}>
                    <Zap size={14} className="animate-pulse" />
                    <span className="text-[10px] font-bold tracking-tight">{streak} Day Streak</span>
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
         </div>
         <div className="flex-1 flex overflow-visible">
            {daysInMonth.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const noteText = data.habitNotes?.[dateKey]?.[habit.id] || '';
              
              if (habit.isNumeric) {
                const progressVal = typeof completions[dateKey]?.[habit.id] === 'number' 
                  ? (completions[dateKey]?.[habit.id] as number) 
                  : (completions[dateKey]?.[habit.id] ? (habit.targetValue || 1) : 0);
                const isFullDone = progressVal >= (habit.targetValue || 0);

                return (
                  <div key={day.toString()} className="min-w-[72px] flex items-center justify-center border-r border-black/5 last:border-r-0">
                    <div className="flex flex-col items-center justify-center gap-1 select-none w-16 mx-auto">
                      <span className="text-[7.5px] font-black text-zinc-400 tracking-tighter leading-none mb-0.5" style={{ color: isFullDone ? (habit.color || '#10b981') : '' }}>
                        {isFullDone ? 'DONE' : 'GOAL'}
                      </span>
                      <div className="flex items-center gap-1 bg-white/40 border border-zinc-200/50 p-1 rounded-full shadow-sm">
                        <button 
                          onClick={() => adjustNumericValue(habit.id, day, -0.5)}
                          className="w-4 h-4 rounded-full bg-zinc-100 hover:bg-zinc-200 text-[10px] font-black flex items-center justify-center cursor-pointer border border-zinc-200/60"
                        >-</button>
                        <div 
                          onClick={() => adjustNumericValue(habit.id, day, isFullDone ? -progressVal : (habit.targetValue || 2) - progressVal)}
                          className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-black cursor-pointer transition-all ${isFullDone ? 'text-white' : 'text-zinc-700 hover:bg-zinc-100'}`}
                          style={{ backgroundColor: isFullDone ? (habit.color || '#ea580c') : '' }}
                        >{progressVal}</div>
                        <button 
                          onClick={() => adjustNumericValue(habit.id, day, 0.5)}
                          className="w-4 h-4 rounded-full bg-zinc-100 hover:bg-zinc-200 text-[10px] font-black flex items-center justify-center cursor-pointer border border-zinc-200/60"
                        >+</button>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 mt-0.5">
                        <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest leading-none truncate max-w-[40px]">
                          {habit.targetValue} {habit.unit}
                        </span>
                        <button onClick={() => openNoteDialog(habit, dateKey)} className={`p-0.5 rounded hover:bg-black/5 transition-all relative ${noteText ? 'text-orange-500 scale-110' : 'text-slate-400'}`}>
                          <MessageSquare size={8} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const isCompleted = !!completions[dateKey]?.[habit.id];
              return (
                <div key={day.toString()} className="min-w-[72px] flex items-center justify-center border-r border-black/5 last:border-r-0">
                  <button 
                    onClick={() => handleToggleHabit(habit.id, day)}
                    className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${isCompleted ? 'scale-110 shadow-lg' : 'bg-black/5 text-transparent hover:bg-black/10'}`}
                    style={{ backgroundColor: isCompleted ? (habit.color || '#10b981') : '', color: 'white' }}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                </div>
              );
            })}
         </div>
      </div>
    );
  };

  const adjustNumericValue = (habitId: string, day: Date, amount: number) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    
    if (onUpdateHabitCompletion) {
       const currentVal = typeof completions[dateKey]?.[habitId] === 'number' 
          ? (completions[dateKey]?.[habitId] as number) 
          : (completions[dateKey]?.[habitId] ? 1 : 0);
       let newVal = Math.max(0, currentVal + amount);
       newVal = Math.round(newVal * 10) / 10;
       onUpdateHabitCompletion(dateKey, habitId, newVal);
    } else {
      onUpdate((prev: AppData) => {
        const currentCompletions = prev.habitCompletions || {};
        const dayCompletions = { ...(currentCompletions[dateKey] || {}) };
        
        const habit = (prev.habits || []).find(h => h.id === habitId);
        if (!habit) return prev;

        const currentVal = typeof dayCompletions[habitId] === 'number' 
          ? (dayCompletions[habitId] as number) 
          : (dayCompletions[habitId] ? (habit.targetValue || 1) : 0);
          
        let newVal = Math.max(0, currentVal + amount);
        newVal = Math.round(newVal * 10) / 10;
        dayCompletions[habitId] = newVal;
        
        return { ...prev, habitCompletions: { ...currentCompletions, [dateKey]: dayCompletions } };
      });
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
    
    onUpdate((prev: AppData) => ({
      ...prev,
      habits: [...(prev.habits || []), newHabit]
    }));
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
                        onUpdate((prev: AppData) => ({ ...prev, dailyNotes: { ...(prev.dailyNotes || {}), [dateKey]: val } }));
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
    <div id="habit-tracker-master-container" className="flex-1 flex flex-col min-h-screen p-4 md:p-8 overflow-y-auto bg-transparent font-sans">


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
            className="flex items-center gap-2 bg-gradient-to-br from-emerald-600 to-emerald-400 text-white px-5 md:px-7 py-3 md:py-4 rounded-2xl font-black text-[10px] md:text-xs tracking-widest hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all shadow-xl disabled:opacity-50 uppercase"
          >
            {isSuggesting ? <RefreshCw size={16} className="animate-spin" /> : <Wand2 size={16} />}
            AI Lessons
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-rose-600 text-white px-5 md:px-7 py-3 md:py-4 rounded-2xl font-black text-[10px] md:text-xs tracking-widest hover:bg-rose-700 hover:-translate-y-1 transition-all shadow-xl uppercase"
            title="Export full mastery dashboard as high-fidelity PDF report"
          >
            <Download size={16} strokeWidth={3} /> Export PDF
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-slate-800 text-white px-5 md:px-7 py-3 md:py-4 rounded-2xl font-black text-[10px] md:text-xs tracking-widest hover:bg-slate-700 hover:-translate-y-1 transition-all shadow-xl uppercase"
            title="Export Last 30 Days completion log, streaks & achievements to CSV"
          >
            <Download size={16} strokeWidth={3} /> Export CSV
          </button>
          <button 
            onClick={() => setIsResettingWeek(true)}
            className="flex items-center gap-2 bg-slate-100 text-slate-900 px-5 md:px-7 py-3 md:py-4 rounded-2xl font-black text-[10px] md:text-xs tracking-widest hover:bg-slate-200 transition-all shadow-xl uppercase border border-slate-200"
            title="Reset weekly progress for a chosen discipline category"
          >
            <RefreshCw size={16} strokeWidth={3} className={isResettingWeek ? "animate-spin" : ""} /> Reset Architecture
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
                 <Wand2 size={16} className="text-emerald-500" />
                 Growth Mastery Insights
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
                  <Plus size={14} className="text-emerald-500 group-hover:scale-125 transition-transform" />
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
                                    onUpdate((prev: AppData) => ({ ...prev, dailyNotes: { ...(prev.dailyNotes || {}), [dateKey]: newNote } })); 
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
                     onUpdate((prev: AppData) => ({ ...prev, dailyNotes: { ...(prev.dailyNotes || {}), [dateKey]: val } }));
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
        <div ref={tableContainerRef} className="overflow-x-auto overflow-y-hidden relative scroll-smooth custom-scrollbar-orange">
          <div className="w-full min-w-max">
            {/* Master Header */}
            <div className="flex bg-zinc-900/5 text-zinc-900 backdrop-blur-md sticky top-0 z-40 border-b border-zinc-200/50">
              <div className="sticky left-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-3 md:p-8 text-left w-[240px] shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.08)]">
                <span className="text-[7px] md:text-[10px] font-black uppercase tracking-[1px] md:tracking-[4px] text-orange-600">Disciplines</span>
              </div>
              <div className="flex overflow-visible h-full">
                {daysInMonth.map(day => (
                  <div key={day.toString()} className={`p-2 md:p-6 min-w-[72px] text-center flex flex-col justify-center border-r border-zinc-100 last:border-r-0 ${isToday(day) ? 'bg-orange-500 text-white font-black shadow-lg shadow-orange-500/30 rounded-b-2xl today-cell' : 'hover:bg-zinc-100/50 transition-colors'}`}>
                    <span className="text-[9px] font-black uppercase block mb-0.5 opacity-60 tracking-wider ">{format(day, 'EEE')}</span>
                    <span className="text-xs font-black tracking-tight">{format(day, 'd')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Virtualized Matrix */}
            <div className="relative">
              {flattenedItems.length > 0 ? (
                <List
                  height={Math.min(600, flattenedItems.reduce((acc, _, i) => acc + getItemSize(i), 0))}
                  itemCount={flattenedItems.length}
                  itemSize={getItemSize}
                  width="100%"
                  outerElementType="div"
                  className="custom-scrollbar-orange overflow-x-hidden"
                >
                  {Row}
                </List>
              ) : (
                <div className="py-32 text-center border-b border-zinc-100">
                  <div className="flex flex-col items-center gap-4 text-white/20">
                    <Zap size={64} strokeWidth={1} />
                    <p className="font-black text-[10px] uppercase tracking-[0.2em] italic opacity-40">No habits tracking yet. Click "Mastery Access" to start.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Streak Mastery Trends - Last 90 Days */}
      <div className="mt-12 bg-white/40 backdrop-blur-3xl border border-white/20 rounded-[40px] p-10 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[120px] -mr-32 -mt-32"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl bg-orange-600 shadow-xl shadow-orange-600/20 flex items-center justify-center text-white font-black text-2xl italic">
                  <Zap size={28} strokeWidth={3} className="animate-pulse" />
               </div>
               <div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Streak Mastery <br/>Intelligence</h3>
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] mt-2 font-sans">90-Day Aggregate Performance Review</p>
               </div>
            </div>
            
            <div className="flex items-center gap-6">
               <div className="text-right">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekly Avg</span>
                  <span className="text-2xl font-black text-slate-800 tracking-tighter">
                    {Math.round(streakData.slice(-7).reduce((acc, curr) => acc + curr.completions, 0) / 7 * 10) / 10}
                  </span>
               </div>
               <div className="h-10 w-px bg-slate-200"></div>
               <div className="text-right">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Peak Load</span>
                  <span className="text-2xl font-black text-emerald-600 tracking-tighter">
                    {Math.max(...streakData.map(d => d.completions))}
                  </span>
               </div>
            </div>
          </div>

          <div className="h-[300px] w-full relative z-10 px-2 overflow-hidden">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={streakData}>
                   <defs>
                      <linearGradient id="colorStreak" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                   <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} 
                      interval={7}
                      padding={{ left: 20, right: 20 }}
                   />
                   <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                      width={30}
                   />
                   <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                              <div className="flex items-center gap-3">
                                 <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                 <p className="text-lg font-black text-white leading-none">
                                    {payload[0].value} <span className="text-[10px] text-orange-500 uppercase">Disciplines</span>
                                 </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                   />
                   <Area 
                      type="monotone" 
                      dataKey="completions" 
                      stroke="#ea580c" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorStreak)" 
                      animationDuration={2000}
                   />
                </AreaChart>
             </ResponsiveContainer>
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
              className="fixed inset-0 z-[200] bg-zinc-950/80 backdrop-blur-xl flex items-start justify-center p-4 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-md rounded-[40px] p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] my-auto relative border border-zinc-100"
              >
                <button 
                  onClick={() => setIsAddingHabit(false)}
                  className="absolute top-8 right-8 p-3 text-zinc-300 hover:text-zinc-900 transition-all z-10 bg-zinc-50 rounded-2xl hover:bg-zinc-100"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>

                <h3 className="text-2xl md:text-3xl font-black text-zinc-900 mb-8 uppercase italic tracking-tight leading-none">New <br/>Mastery Habit</h3>
                
                <div className="space-y-8 mb-10 max-h-[70vh] md:max-h-none overflow-y-auto px-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block ml-4 font-sans">Identity & Name</label>
                    <input 
                      autoFocus
                      type="text"
                      value={newHabitName}
                      onChange={e => setNewHabitName(e.target.value)}
                      placeholder="e.g., Deep Work Session"
                      className="w-full bg-zinc-50 border-2 border-transparent rounded-[28px] py-6 px-8 text-lg font-black outline-none focus:border-orange-500 focus:bg-white transition-all placeholder:text-zinc-300 shadow-sm"
                      onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block ml-4 font-sans">Category</label>
                    <input 
                      type="text"
                      value={newHabitCategory}
                      onChange={e => setNewHabitCategory(e.target.value)}
                      placeholder="e.g., Morning, Health, Work"
                      className="w-full bg-zinc-50 border-2 border-transparent rounded-[28px] py-5 px-8 text-base font-bold outline-none focus:border-orange-500 focus:bg-white transition-all placeholder:text-zinc-300 shadow-sm"
                      onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
                    />
                  </div>

                <div className="p-8 bg-zinc-900/5 rounded-[36px] border border-zinc-100 flex flex-col gap-6 ">
                  <div className="flex items-center justify-between cursor-pointer group px-2" onClick={() => setIsNumericHabit(!isNumericHabit)}>
                    <div>
                      <span className="text-[12px] font-black text-zinc-900 uppercase tracking-tight block">Numerical Tracking</span>
                      <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-[0.1em] mt-1">Units (liters, reps, km)</span>
                    </div>
                    <div 
                      className={`w-14 h-8 flex items-center rounded-full p-1.5 cursor-pointer transition-all duration-500 ${isNumericHabit ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 'bg-zinc-200'}`}
                    >
                      <motion.div 
                        animate={{ x: isNumericHabit ? 24 : 0 }}
                        className="bg-white w-5 h-5 rounded-full shadow-md" 
                      />
                    </div>
                  </div>

                  {isNumericHabit && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200/50"
                    >
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block ml-3">Daily Goal</label>
                        <input 
                          type="number"
                          value={habitTargetValue}
                          onChange={e => setHabitTargetValue(Math.max(0.1, parseFloat(e.target.value) || 1))}
                          className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-orange-500 transition-all"
                          min="0.1"
                          step="0.5"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block ml-3">Metric Unit</label>
                        <input 
                          type="text"
                          value={habitUnit}
                          onChange={e => setHabitUnit(e.target.value)}
                          placeholder="e.g. km"
                          className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-orange-500 transition-all placeholder:text-zinc-300"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsAddingHabit(false)}
                  className="flex-1 py-5 text-zinc-400 font-black text-[11px] uppercase tracking-[0.2em] hover:text-zinc-900 transition-all"
                >
                  DISCARD
                </button>
                <button 
                  onClick={handleAddHabit}
                  className="flex-1 bg-gradient-to-br from-orange-600 to-orange-400 text-white rounded-[24px] py-5 font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.03] active:scale-95 transition-all border-b-4 border-orange-800"
                >
                  CREATE MASTERY HABIT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {/* Milestone Celebration Overlay Pop-up Modal */}
        {milestoneCelebration && (
          <>
          <ConfettiOverlay streak={milestoneCelebration.streak} habitName={milestoneCelebration.habitName} onComplete={() => {}} />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-start justify-center p-4 z-[200] select-none overflow-y-auto"
          >
            {/* Visual Confetti / Glitter elements */}
            <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
              <div className="absolute w-[500px] h-[500px] bg-orange-500/10 rounded-full filter blur-3xl animate-pulse top-0 left-10"></div>
              <div className="absolute w-[600px] h-[600px] bg-emerald-500/10 rounded-full filter blur-3xl animate-pulse bottom-0 right-10"></div>
            </div>

            <motion.div 
              initial={{ scale: 0.85, y: 50, rotate: -2 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.85, y: 50, rotate: 2 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-white rounded-[40px] border border-slate-200 p-8 md:p-12 shadow-2xl max-w-lg w-full text-center relative overflow-hidden my-auto md:my-16"
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
          </>
        )}

        {/* Date-specific Habit Note Modal */}
        {editingNoteState && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <p className="text-[9px] font-bold text-orange-600 uppercase tracking-widest mb-1">Habit Daily Notes Context</p>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: editingNoteState.habitColor || '#ea580c' }} />
                    {editingNoteState.habitName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{editingNoteState.date}</p>
                </div>
                <button 
                  onClick={() => setEditingNoteState(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              
              {/* Body */}
              <div className="p-6 flex flex-col gap-4">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Why was this habit goal met or missed?
                </label>
                <textarea
                  className="w-full h-32 p-4 border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-800 placeholder:text-slate-400 text-sm font-medium resize-none transition-all shadow-inner"
                  placeholder="Provide context e.g., Slept in late so had to rush work, missing the early workout window."
                  value={editingNoteState.noteText}
                  onChange={(e) => setEditingNoteState(prev => prev ? { ...prev, noteText: e.target.value } : null)}
                  autoFocus
                />
              </div>
              
              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setEditingNoteState(null)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-100 transition-all font-sans"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const updatedNotes = { ...(data.habitNotes || {}) };
                    if (!updatedNotes[editingNoteState.date]) {
                      updatedNotes[editingNoteState.date] = {};
                    }
                    updatedNotes[editingNoteState.date][editingNoteState.habitId] = editingNoteState.noteText;
                    
                    onUpdate((prev: AppData) => ({
                      ...prev,
                      habitNotes: updatedNotes
                    }));
                    
                    setEditingNoteState(null);
                  }}
                  className="px-6 py-2.5 bg-slate-900 border border-transparent text-white rounded-2xl text-xs font-bold hover:bg-slate-800 hover:-translate-y-0.5 transition-all shadow-lg font-sans"
                >
                  Save Daily Context
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Week Final Confirmation Modal */}
      <AnimatePresence>
        {isResettingWeek && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-zinc-950/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl relative border border-zinc-100"
            >
              <div className="space-y-6 mb-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                    <RefreshCw size={32} />
                  </div>
                </div>
                <h3 className="text-xl font-black text-zinc-900 uppercase italic tracking-tight leading-none text-center">Reset Week <br/>Architecture</h3>
                
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Control Category</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(groupedHabits).sort().map(cat => (
                    <button 
                      key={cat}
                      type="button"
                      onClick={() => setResetTargetCategory(cat)}
                      className={`px-3 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${resetTargetCategory === cat ? 'bg-orange-600 border-orange-600 text-white shadow-lg scale-105' : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:bg-zinc-100'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[3px] block mb-2">Active Week Context</span>
                  <div className="font-mono text-[10px] text-slate-900 font-bold bg-white p-2 rounded-lg border border-slate-100">
                    {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} — {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 font-bold leading-relaxed px-4">
                  Caution: This irreversible protocol will erase all log history for <span className="text-orange-600">"{resetTargetCategory}"</span> within this temporal window.
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsResettingWeek(false)}
                  className="flex-1 py-4 bg-zinc-50 text-zinc-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleResetCategoryWeek}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-600/20"
                >
                  Execute Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Report for PDF Export - Rendered only for capture */}
      <div id="habit-tracker-full-report-target" style={{ display: 'none', padding: '60px', backgroundColor: 'white', color: 'black', fontFamily: 'Inter, sans-serif' }}>
        <style>
          {`
            @media print {
              #habit-tracker-full-report-target {
                display: block !important;
                padding: 10mm !important;
                width: 297mm;
                height: 210mm;
                overflow: hidden;
              }
              .report-page {
                height: 190mm;
                display: flex;
                flex-direction: column;
                page-break-after: always;
              }
              h1, h2, h3, p, span {
                font-family: 'Inter', sans-serif !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            .disciplines-list {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            .habit-item {
              break-inside: avoid;
            }
          `}
        </style>
        <div className="report-page">
          <div style={{ borderBottom: '8px solid #ea580c', paddingBottom: '30px', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '48px', fontWeight: '900', textTransform: 'uppercase', color: '#000', margin: '0', letterSpacing: '-3px' }}>Identity Mastery Intelligence</h1>
            <p style={{ color: '#ea580c', fontWeight: '900', letterSpacing: '6px', fontSize: '13px', marginTop: '10px' }}>SYSTEM ARCHITECTURE PERFORMANCE LOG • {format(new Date(), 'MMMM yyyy')}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '60px', flex: 1 }}>
             <div>
                <h2 style={{ fontSize: '16px', fontWeight: '900', color: '#000', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '30px', borderBottom: '3px solid #000', paddingBottom: '12px' }}>Operational Disciplines</h2>
                <div className="disciplines-list">
                  {habits.sort((a,b) => getStreak(b.id) - getStreak(a.id)).map((h) => {
                    const streak = getStreak(h.id);
                    return (
                      <div key={h.id} className="habit-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '15px 20px', borderRadius: '16px', borderLeft: `6px solid ${h.color || '#ea580c'}` }}>
                          <span style={{ fontWeight: '900', fontSize: '15px', color: '#0f172a', textTransform: 'uppercase' }}>{h.name}</span>
                          <span style={{ fontWeight: '900', color: streak > 0 ? '#ea580c' : '#94a3b8', fontSize: '15px', fontStyle: 'italic' }}>
                            STREAK: {streak}
                          </span>
                      </div>
                    );
                  })}
                </div>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={{ backgroundColor: '#0f172a', padding: '40px', borderRadius: '40px', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '900', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '30px' }}>Global Velocity</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px' }}>
                       <div>
                          <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Active Nodes</span>
                          <span style={{ fontSize: '48px', fontWeight: '900' }}>{habits.length}</span>
                       </div>
                       <div>
                          <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Mastery Flow</span>
                          <span style={{ fontSize: '48px', fontWeight: '900', color: '#10b981' }}>{habits.filter(h => getStreak(h.id) > 0).length}</span>
                       </div>
                    </div>
                </div>

                <div style={{ padding: '30px', backgroundColor: '#f1f5f9', borderRadius: '40px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Temporal Insight</h2>
                    <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#334155', fontStyle: 'italic', fontWeight: '600' }}>
                      "The quality of your hierarchy determines the quality of your output. This summary reflects a commitment to the architecture of character."
                    </p>
                </div>
             </div>
          </div>

          <div style={{ borderTop: '4px solid #000', paddingTop: '30px', textAlign: 'center', marginTop: 'auto' }}>
             <p style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '10px' }}>IDENTITY ARCHITECTURE SYSTEM • PERFORMANCE HUB VER: ALPHA</p>
          </div>
        </div>
      </div>
    </div>
  );
};
