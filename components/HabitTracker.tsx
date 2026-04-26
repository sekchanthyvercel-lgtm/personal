import React, { useState } from 'react';
import { AppData, Habit, HabitCompletion } from '../types';
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2, Zap } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';

interface HabitTrackerProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({ data, onUpdate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  const habits = data.habits || [];
  const completions = data.habitCompletions || {};

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleToggleHabit = (habitId: string, day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const newCompletions = { ...completions };
    
    if (!newCompletions[dateKey]) {
      newCompletions[dateKey] = {};
    }
    
    newCompletions[dateKey][habitId] = !newCompletions[dateKey][habitId];
    onUpdate({ ...data, habitCompletions: newCompletions });
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
      color: habitColor
    };
    
    onUpdate({ ...data, habits: [...habits, newHabit] });
    setNewHabitName('');
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

  const getStreak = (habitId: string) => {
    let currentStreak = 0;
    const today = new Date();
    
    // Check if missed yesterday and today. If so, streak is 0.
    const todayKey = format(today, 'yyyy-MM-dd');
    const yesterdayKey = format(subDays(today, 1), 'yyyy-MM-dd');
    
    let dateToCheck = today;
    
    // If today is not completed, check if yesterday was. If neither, streak is 0.
    if (!completions[todayKey]?.[habitId]) {
      if (!completions[yesterdayKey]?.[habitId]) {
        return 0;
      }
      dateToCheck = subDays(today, 1);
    }
    
    while (true) {
      const dateKey = format(dateToCheck, 'yyyy-MM-dd');
      if (completions[dateKey]?.[habitId]) {
        currentStreak++;
        dateToCheck = subDays(dateToCheck, 1);
      } else {
        break;
      }
    }
    return currentStreak;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/[0.02] backdrop-blur-3xl p-4 md:p-8 overflow-y-auto md:overflow-hidden font-sans">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic drop-shadow-sm">
            Performance Mastery Hub
          </h1>
          <p className="text-orange-600 font-bold mt-1 text-[10px] md:text-xs tracking-widest uppercase opacity-80 text-center md:text-left">
            {format(currentDate, 'EEEE, MMM do, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center">
          <div className="flex bg-white/20 backdrop-blur-xl rounded-2xl p-1 border border-white/40 shadow-sm">
            <button 
              onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="p-2 md:p-3 hover:bg-white/40 rounded-xl transition-all text-slate-900"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 md:px-6 flex items-center font-black text-[9px] md:text-[10px] tracking-[0.2em] text-slate-900 uppercase">
              {format(currentDate, 'MMM yyyy')}
            </div>
            <button 
              onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="p-2 md:p-3 hover:bg-white/40 rounded-xl transition-all text-slate-900"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          <button 
            onClick={() => setIsAddingHabit(true)}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[10px] md:text-xs tracking-widest hover:bg-orange-500 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-orange-600/20 uppercase"
          >
            <Plus size={16} /> Add Mastery
          </button>
        </div>
      </div>

      {/* Reflections linked to data - Moved to Top */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-black/40 backdrop-blur-2xl border border-orange-500/20 rounded-[28px] p-6 text-white group transition-all"
          >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-black uppercase tracking-tighter text-base italic text-orange-400">Weekly Review</h4>
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
              </div>
              <p className="text-[11px] font-bold text-white/80 line-clamp-2 min-h-[2.5rem]">
                {data.reflections?.weeklyReview?.content || "Reflect on your wins and adjustments for the week."}
              </p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-black/40 backdrop-blur-2xl border border-emerald-500/20 rounded-[28px] p-6 text-white group transition-all"
          >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-black uppercase tracking-tighter text-base italic text-emerald-400">Monthly Challenge</h4>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              </div>
              <p className="text-[11px] font-bold text-white/80 line-clamp-2 min-h-[2.5rem]">
                {data.reflections?.monthlyChallenge?.content || "Set and evaluate your 30-day mastery goals."}
              </p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-black/40 backdrop-blur-2xl border border-indigo-500/20 rounded-[28px] p-6 text-white group transition-all"
          >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-black uppercase tracking-tighter text-base italic text-indigo-400">3-Month Vision</h4>
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              </div>
              <p className="text-[11px] font-bold text-white/80 line-clamp-2 min-h-[2.5rem]">
                {data.reflections?.threeMonthVision?.content || "Quarterly deep-dive into your growth journey."}
              </p>
          </motion.div>
      </div>

      <div className="flex-1 bg-white/5 backdrop-blur-3xl border border-white/20 rounded-[36px] shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar-orange flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/5 text-black backdrop-blur-md">
                <th className="sticky left-0 z-20 bg-white/10 backdrop-blur-3xl p-6 text-left border-b border-black/10 w-64 min-w-[256px]">
                  <span className="text-[10px] font-black uppercase tracking-[3px] opacity-60 text-black">Mastery Habits</span>
                </th>
                {daysInMonth.map(day => (
                  <th key={day.toString()} className={`p-4 border-b border-black/10 min-w-[60px] text-center ${isToday(day) ? 'bg-orange-500/20 font-bold' : ''}`}>
                    <span className="text-xs font-black text-black">{format(day, 'd')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((habit, idx) => {
                const streak = getStreak(habit.id);
                return (
                 <tr key={habit.id} className="group hover:bg-black/5 transition-colors">
                  <td className="sticky left-0 z-10 bg-white/10 backdrop-blur-3xl group-hover:bg-white/20 p-6 border-b border-black/10 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-black text-black uppercase tracking-tight" style={{ color: habit.color || 'black' }}>
                        {habit.name}
                      </span>
                      {streak > 0 && (
                        <div className="flex items-center gap-1.5" style={{ color: habit.color }}>
                          <Zap size={14} className="animate-pulse" />
                          <span className="text-xs font-bold">{streak} Day Streak</span>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-black/30 hover:text-red-600 transition-all rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                  {daysInMonth.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const isCompleted = completions[dateKey]?.[habit.id];
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

      {/* Styled scrollbar css */}
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
              className="bg-white w-full max-w-md rounded-[32px] p-10 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight">New Mastery Habit</h3>
              <input 
                autoFocus
                type="text"
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                placeholder="e.g., Get up at 6:00 AM"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-lg font-bold outline-none focus:border-indigo-500 transition-all mb-8"
                onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
              />
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
      </AnimatePresence>
    </div>
  );
};
