import React, { useState, useEffect } from 'react';
import { AppData, Habit, HabitCompletion } from '../types';
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2, Zap, Maximize2, Minimize2, Calendar as CalendarIcon, Edit3, Target } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, subDays, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';

interface HabitTrackerProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({ data, onUpdate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPlanningDate, setSelectedPlanningDate] = useState(new Date());
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [planningNote, setPlanningNote] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const habits = data.habits || [];
  const completions = data.habitCompletions || {};
  const notes = data.dailyNotes || {}; 

  useEffect(() => {
    if (!isTyping) {
      const dateKey = format(selectedPlanningDate, 'yyyy-MM-dd');
      setPlanningNote(notes[dateKey] || '');
    }
  }, [selectedPlanningDate, notes, isTyping]);

  const savePlanningNote = () => {
    const dateKey = format(selectedPlanningDate, 'yyyy-MM-dd');
    const newNotes = { ...notes, [dateKey]: planningNote };
    onUpdate({ ...data, dailyNotes: newNotes });
  };

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
    <div className={`flex-1 flex flex-col transition-all duration-500 ${isFullScreen ? 'overflow-hidden' : 'min-h-screen p-4 md:p-8 overflow-y-auto bg-transparent'} font-sans`}>
      {/* Full Screen Calendar View */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-white/5 backdrop-blur-[60px] p-4 md:p-12 overflow-y-auto"
          >
            <div className="max-w-[98dvw] lg:max-w-[90dvw] xl:max-w-7xl mx-auto w-full">
              {/* Full Screen Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                 <h2 className="text-2xl md:text-5xl font-black text-slate-800 tracking-tighter uppercase italic flex items-center gap-4">
                    <CalendarIcon className="text-orange-600" size={32} />
                    Monthly Planner
                 </h2>
                 <button 
                  onClick={() => setIsFullScreen(false)}
                  className="p-3 md:p-4 bg-slate-900 text-white rounded-2xl hover:bg-orange-600 transition-all shadow-xl flex items-center justify-center shrink-0"
                 >
                   <Minimize2 size={24} />
                 </button>
              </div>

              {/* Top Planning Board (Smaller as requested) */}
              <div className="mb-8">
                 <div className="bg-white/10 backdrop-blur-3xl rounded-[32px] p-6 border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl -mr-16 -mt-16"></div>
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                              <Edit3 size={18} />
                          </div>
                          <div>
                              <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">Architecture of Resolve</p>
                              <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">{format(selectedPlanningDate, 'MMMM do, yyyy')}</h3>
                          </div>
                       </div>
                    </div>
                    <textarea 
                        value={planningNote}
                        onFocus={() => setIsTyping(true)}
                        onChange={(e) => setPlanningNote(e.target.value)}
                        onBlur={() => {
                          setIsTyping(false);
                          savePlanningNote();
                        }}
                        className="w-full h-24 bg-white/5 rounded-2xl p-4 text-slate-800 font-bold text-lg outline-none border border-white/10 focus:border-orange-500 transition-all placeholder:text-slate-400 resize-none shadow-inner"
                        placeholder="Define your focus..."
                    />
                 </div>
              </div>

              {/* 30 Day Grid View - See ALL at once */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 pb-20">
                {daysInMonth.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isSel = isSameDay(day, selectedPlanningDate);
                  const dailyCompletions = habits.reduce((acc, h) => acc + (completions[h.id]?.[dateKey] ? 1 : 0), 0);
                  const dayNote = notes[dateKey];
                  
                  return (
                    <motion.div
                      key={day.toString()}
                      whileHover={{ y: -3, backgroundColor: 'rgba(255,255,255,0.1)' }}
                      onClick={() => setSelectedPlanningDate(day)}
                      className={`aspect-square rounded-[24px] p-4 cursor-pointer border transition-all relative overflow-hidden flex flex-col justify-between ${isSel ? 'border-orange-500 bg-white/20 shadow-2xl scale-[1.05] z-10' : 'border-white/10 bg-white/5 backdrop-blur-md shadow-sm'}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-lg font-black ${isToday(day) ? 'text-orange-600 underline decoration-orange-600/30' : 'text-slate-400 opacity-60'}`}>
                          {format(day, 'd')}
                        </span>
                        <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">
                          {format(day, 'EEE')}
                        </span>
                      </div>

                      <div className="flex-1 mt-2 overflow-hidden pointer-events-none">
                        {dayNote && (
                          <div className="text-[10px] font-bold text-slate-700 line-clamp-4 leading-tight italic">
                            {dayNote}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-2">
                        {dailyCompletions > 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/80 text-white rounded-lg">
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
          </motion.div>
        )}
      </AnimatePresence>


      {/* Main View Header */}
      <div className={`flex flex-col md:flex-row items-center justify-between mb-6 gap-6 shrink-0 ${isFullScreen ? 'hidden' : ''}`}>
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
               <span className="block text-[8px] font-black uppercase text-orange-600 leading-none mb-1 tracking-widest group-hover/year:scale-110 transition-transform">{format(currentDate, 'yyyy')}</span>
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
                      <h3 className="text-sm font-black text-slate-900 tracking-tighter uppercase italic">Strategic Planning</h3>
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
              <textarea 
                 value={planningNote}
                 onFocus={() => setIsTyping(true)}
                 onChange={(e) => setPlanningNote(e.target.value)}
                 onBlur={() => {
                   setIsTyping(false);
                   savePlanningNote();
                 }}
                 placeholder={`Mission goals for tomorrow...`}
                 className="w-full h-20 bg-white/5 rounded-xl p-4 text-slate-800 font-bold text-sm outline-none border border-transparent focus:border-orange-500/30 transition-all placeholder:text-slate-400 resize-none"
              />
          </div>

          <div className="lg:col-span-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[24px] p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 italic">
                  <Zap size={14} /> Weekly Insight
                </h4>
                <p className="text-[10px] font-bold text-slate-500 line-clamp-3">
                  {data.reflections?.weeklyReview?.content || "Synchronize your objectives for peak efficiency."}
                </p>
              </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col ${isFullScreen ? 'hidden' : ''}`}>
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar-orange flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/5 text-slate-900 backdrop-blur-md">
                <th className="md:sticky left-0 z-20 bg-white/40 backdrop-blur-3xl p-6 md:p-8 text-left border-b border-slate-200/50 w-64 md:w-72 min-w-[240px] md:min-w-[288px] shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-[4px] text-orange-600">Mastery Disciplines</span>
                </th>
                {daysInMonth.map(day => (
                  <th key={day.toString()} className={`p-4 md:p-6 border-b border-slate-200/50 min-w-[60px] md:min-w-[72px] text-center ${isToday(day) ? 'bg-orange-500 text-white font-black shadow-lg shadow-orange-500/30 rounded-b-2xl' : 'hover:bg-slate-100/50 transition-colors'}`}>
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
                  <td className="md:sticky left-0 z-10 bg-white/5 backdrop-blur-3xl group-hover:bg-white/10 p-6 border-b border-black/10 flex items-center justify-between shadow-sm">
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
