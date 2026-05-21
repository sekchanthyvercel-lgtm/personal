import React, { useState, useMemo } from 'react';
import { AppData, AdvancedHabit, HabitReframerRecord } from '../types';
import { 
  Plus, 
  Trash2, 
  Zap, 
  Sparkles, 
  Scale, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Brain, 
  ShieldAlert, 
  CheckCircle2, 
  PlusCircle,
  HelpCircle,
  Calendar,
  X,
  Gauge,
  Hourglass,
  Sliders,
  Check
} from 'lucide-react';
import { 
  startOfWeek, 
  addDays, 
  format, 
  isToday as checkIsToday, 
  parseISO, 
  subDays,
  startOfDay
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';

interface AdvancedHabitTrackerProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
}

const DEFAULT_COLOR_THEMES = [
  { id: 'rose', bg: 'bg-rose-50 border-rose-100 text-rose-700', activeBg: 'bg-rose-500', barBg: 'bg-rose-200', accent: 'text-rose-600', ring: 'focus:ring-rose-500/20' },
  { id: 'sky', bg: 'bg-sky-50 border-sky-100 text-sky-700', activeBg: 'bg-sky-500', barBg: 'bg-sky-200', accent: 'text-sky-600', ring: 'focus:ring-sky-500/20' },
  { id: 'emerald', bg: 'bg-emerald-50 border-emerald-100 text-emerald-700', activeBg: 'bg-emerald-500', barBg: 'bg-emerald-200', accent: 'text-emerald-600', ring: 'focus:ring-emerald-500/20' },
  { id: 'amber', bg: 'bg-amber-50 border-amber-100 text-amber-700', activeBg: 'bg-amber-500', barBg: 'bg-amber-200', accent: 'text-amber-600', ring: 'focus:ring-amber-500/20' },
  { id: 'violet', bg: 'bg-violet-50 border-violet-100 text-violet-700', activeBg: 'bg-violet-500', barBg: 'bg-violet-200', accent: 'text-violet-600', ring: 'focus:ring-violet-500/20' },
  { id: 'indigo', bg: 'bg-indigo-50 border-indigo-100 text-indigo-700', activeBg: 'bg-indigo-500', barBg: 'bg-indigo-200', accent: 'text-indigo-600', ring: 'focus:ring-indigo-500/20' },
];

export const AdvancedHabitTracker: React.FC<AdvancedHabitTrackerProps> = ({ data, onUpdate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isLoggingModalOpen, setIsLoggingModalOpen] = useState<string | null>(null); // habit ID
  const [activeFastingTab, setActiveFastingTab] = useState<'tracker' | 'reflections'>('tracker');
  const [newFastRef, setNewFastRef] = useState('');
  const [previewName, setPreviewName] = useState('Self');

  // CBT Habit Writing states
  const [isAddingReframer, setIsAddingReframer] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [reframerForm, setReframerForm] = useState({
    thought: '',
    feeling: '',
    intention: '',
    actualOutcome: '',
    alternativeStrategy: '',
    studentId: '',
    
    // Expanded D.O.P.A.M.I.N.E. framework properties
    isFullDopamineAudit: false,
    substanceOrBehavior: '',
    frequencyAndAmount: '',
    objectives: '',
    
    pNeuroadaptation: '',
    pRelationships: '',
    pWork: '',
    pFinancial: '',
    pHealth: '',
    pSpiritual: '',
    
    abstinencePlan: '',
    mindfulnessNotes: '',
    insightHonesty: '',
    nextStepsPlan: '',
    experimentRules: ''
  });

  // Form states for custom habit
  const [habitForm, setHabitForm] = useState({
    name: '',
    type: 'dopamine' as 'dopamine' | 'effort',
    unit: 'Minutes',
    weeklyGoal: '120',
    goalType: 'limit' as 'limit' | 'target',
    color: 'sky'
  });

  const habits = data.advancedHabits || [];
  const logs = data.advancedHabitLogs || {};

  // Formatted start & end of currently viewing week
  const startOfCurrentWeek = useMemo(() => {
    return startOfWeek(selectedDate, { weekStartsOn: 1 }); // Starts on Monday
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));
  }, [startOfCurrentWeek]);

  // Fasting Challenge state: (stored in settings for easy persistence)
  const fastingState = data.settings?.dopamineFast || {
    isActive: false,
    startDate: '',
    durationDays: 1,
    reflections: [] as { date: string; content: string }[]
  };

  const handlePrevWeek = () => {
    setSelectedDate(subDays(selectedDate, 7));
  };

  const handleNextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const getSubjectShortName = (nameOrText?: string) => {
    if (!nameOrText || nameOrText === 'Self') return 'you';
    const firstWord = nameOrText.trim().split(/\s+/)[0];
    return firstWord || 'you';
  };

  const handleAddReframer = () => {
    if (reframerForm.isFullDopamineAudit && !reframerForm.substanceOrBehavior?.trim()) {
      alert('Please fill out the Substance or Behavior (Data) field to proceed.');
      return;
    }
    if (!reframerForm.isFullDopamineAudit && !reframerForm.thought.trim()) {
      alert('Please fill out the Automatic Thought field.');
      return;
    }
    const selectedStudent = data.students?.find(s => s.id === reframerForm.studentId);
    
    const newRecord: HabitReframerRecord = {
      id: uuidv4(),
      date: new Date().toISOString(),
      thought: reframerForm.isFullDopamineAudit 
        ? `Behavior: ${reframerForm.substanceOrBehavior?.trim()}` 
        : reframerForm.thought.trim(),
      feeling: reframerForm.isFullDopamineAudit 
        ? `${reframerForm.frequencyAndAmount?.trim() || 'Dopamine audit'}` 
        : reframerForm.feeling.trim(),
      intention: reframerForm.isFullDopamineAudit 
        ? `Reset: ${reframerForm.abstinencePlan?.trim() || 'Purification'}` 
        : reframerForm.intention.trim(),
      actualOutcome: reframerForm.isFullDopamineAudit 
        ? `Action: ${reframerForm.nextStepsPlan?.trim() || 'Post-reset code'}` 
        : reframerForm.actualOutcome.trim(),
      alternativeStrategy: reframerForm.isFullDopamineAudit 
        ? `Rules: ${reframerForm.experimentRules?.trim() || 'Active Experiment'}` 
        : reframerForm.alternativeStrategy.trim(),
      studentId: reframerForm.studentId || undefined,
      studentName: selectedStudent ? selectedStudent.name : 'Self',
      
      // Save all extended fields for full DOPAMINE framework
      isFullDopamineAudit: reframerForm.isFullDopamineAudit,
      substanceOrBehavior: reframerForm.substanceOrBehavior?.trim() || undefined,
      frequencyAndAmount: reframerForm.frequencyAndAmount?.trim() || undefined,
      objectives: reframerForm.objectives?.trim() || undefined,
      
      pNeuroadaptation: reframerForm.pNeuroadaptation?.trim() || undefined,
      pRelationships: reframerForm.pRelationships?.trim() || undefined,
      pWork: reframerForm.pWork?.trim() || undefined,
      pFinancial: reframerForm.pFinancial?.trim() || undefined,
      pHealth: reframerForm.pHealth?.trim() || undefined,
      pSpiritual: reframerForm.pSpiritual?.trim() || undefined,
      
      abstinencePlan: reframerForm.abstinencePlan?.trim() || undefined,
      mindfulnessNotes: reframerForm.mindfulnessNotes?.trim() || undefined,
      insightHonesty: reframerForm.insightHonesty?.trim() || undefined,
      nextStepsPlan: reframerForm.nextStepsPlan?.trim() || undefined,
      experimentRules: reframerForm.experimentRules?.trim() || undefined
    };
    
    onUpdate({
      ...data,
      habitReframers: [newRecord, ...(data.habitReframers || [])]
    });
    
    // Reset form cleanly
    setReframerForm({
      thought: '',
      feeling: '',
      intention: '',
      actualOutcome: '',
      alternativeStrategy: '',
      studentId: '',
      
      isFullDopamineAudit: false,
      substanceOrBehavior: '',
      frequencyAndAmount: '',
      objectives: '',
      
      pNeuroadaptation: '',
      pRelationships: '',
      pWork: '',
      pFinancial: '',
      pHealth: '',
      pSpiritual: '',
      
      abstinencePlan: '',
      mindfulnessNotes: '',
      insightHonesty: '',
      nextStepsPlan: '',
      experimentRules: ''
    });
    setIsAddingReframer(false);
  };

  const handleDeleteReframer = (id: string) => {
    if (window.confirm('Are you sure you want to delete this cognitive alignment reflection record?')) {
      onUpdate({
        ...data,
        habitReframers: (data.habitReframers || []).filter(r => r.id !== id)
      });
    }
  };

  const handleAddAdvancedHabit = () => {
    if (!habitForm.name.trim()) return;

    const newHabit: AdvancedHabit = {
      id: uuidv4(),
      name: habitForm.name.trim(),
      type: habitForm.type,
      unit: habitForm.unit,
      weeklyGoal: habitForm.weeklyGoal ? parseFloat(habitForm.weeklyGoal) : undefined,
      goalType: habitForm.type === 'dopamine' ? 'limit' : 'target',
      color: habitForm.color,
      createdAt: new Date().toISOString()
    };

    onUpdate({
      ...data,
      advancedHabits: [...habits, newHabit]
    });

    setHabitForm({
      name: '',
      type: 'dopamine',
      unit: 'Minutes',
      weeklyGoal: '120',
      goalType: 'limit',
      color: 'sky'
    });
    setIsAddingHabit(false);
  };

  const handleDeleteHabit = (id: string) => {
    if (confirm('Are you sure you want to delete this habit and all its logged statistics?')) {
      onUpdate({
        ...data,
        advancedHabits: habits.filter(h => h.id !== id)
      });
    }
  };

  // Safe numerical logging
  const handleLogValue = (habitId: string, dayDate: Date, valueStr: string) => {
    const dateStr = format(dayDate, 'yyyy-MM-dd');
    const numericVal = parseFloat(valueStr);
    const finalVal = isNaN(numericVal) ? 0 : Math.max(0, numericVal);

    const updatedLogs = { ...logs };
    if (!updatedLogs[dateStr]) {
      updatedLogs[dateStr] = {};
    }
    updatedLogs[dateStr][habitId] = finalVal;

    onUpdate({
      ...data,
      advancedHabitLogs: updatedLogs
    });
  };

  // Helper: Format metrics beautifully, handle minutes conversion to hours
  const formatMetric = (val: number, unit: string) => {
    const num = val || 0;
    if (unit.toLowerCase() === 'minutes') {
      if (num >= 60) {
        const hrs = Math.floor(num / 60);
        const mins = Math.round(num % 60);
        return `${num}m (${hrs}h ${mins}m)`;
      }
      return `${num} mins`;
    }
    return `${num} ${unit}`;
  };

  // Retrieve logged values for a habit across the 7 days of the selected week
  const getWeeklyHabitStats = (habit: AdvancedHabit) => {
    let total = 0;
    const dailyValues = weekDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const val = logs[dateStr]?.[habit.id] || 0;
      total += val;
      return { day, val };
    });

    const average = total / 7;
    return { dailyValues, total, average };
  };

  // Totals for Dopamine (Pleasure) and Effort (Pain/Resilience)
  const balanceSums = useMemo(() => {
    let dopaminePoints = 0;
    let effortPoints = 0;

    habits.forEach(h => {
      const { total } = getWeeklyHabitStats(h);
      // We normalize slightly: minutes are divided by 60 for hour-equivalent load, others taken directly
      const points = h.unit.toLowerCase() === 'minutes' ? total / 60 : total;
      if (h.type === 'dopamine') {
        dopaminePoints += points;
      } else {
        effortPoints += points;
      }
    });

    return { dopaminePoints, effortPoints };
  }, [habits, logs, startOfCurrentWeek]);

  // Compute scale angle of tilt based on balance
  const tiltAngle = useMemo(() => {
    const { dopaminePoints, effortPoints } = balanceSums;
    if (dopaminePoints === 0 && effortPoints === 0) return 0;
    const diff = effortPoints - dopaminePoints; // more effort tilts right (+), more dopamine tilts left (-)
    const maxScore = Math.max(1, dopaminePoints + effortPoints);
    const rawTilt = (diff / maxScore) * 25; // tilt up to 25 degrees
    return Math.min(Math.max(rawTilt, -25), 25);
  }, [balanceSums]);

  // Start Dopamine Reset Fast
  const handleStartResetFast = (days: number) => {
    onUpdate({
      ...data,
      settings: {
        ...data.settings,
        dopamineFast: {
          isActive: true,
          startDate: format(new Date(), 'yyyy-MM-dd'),
          durationDays: days,
          reflections: []
        }
      }
    });
  };

  // End / Stop Fast
  const handleStopResetFast = () => {
    if (confirm('Stop your dopamine reset process early? Receptors restore best when you complete the session.')) {
      onUpdate({
        ...data,
        settings: {
          ...data.settings,
          dopamineFast: {
            isActive: false,
            startDate: '',
            durationDays: 1,
            reflections: []
          }
        }
      });
    }
  };

  // Completed Reset Fast
  const handleCompleteResetFast = () => {
    alert('Congratulations! Your dopamine fast is complete. Your neurochemical receptors are starting to downregulate back to baseline baseline. Keep up your deferred effort habits.');
    onUpdate({
      ...data,
      settings: {
        ...data.settings,
        dopamineFast: {
          isActive: false,
          startDate: '',
          durationDays: 1,
          reflections: fastingState.reflections // Keep reflections for history
        }
      }
    });
  };

  // Record daily fast thoughts
  const handleAddFastReflection = () => {
    if (!newFastRef.trim()) return;
    const currentReflections = fastingState.reflections || [];
    onUpdate({
      ...data,
      settings: {
        ...data.settings,
        dopamineFast: {
          ...fastingState,
          reflections: [
            ...currentReflections,
            { date: format(new Date(), 'MMM d, yyyy h:mm a'), content: newFastRef.trim() }
          ]
        }
      }
    });
    setNewFastRef('');
  };

  return (
    <div id="advanced-habit-tracker-root" className="flex-1 bg-[#fcfcfc] p-4 md:p-8 overflow-y-auto font-sans text-slate-900">
      
      {/* Header and Metaphor Explanation */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
             <Scale className="text-amber-500 animate-pulse" size={32} />
             Advanced Dopamine Tracker
          </h1>
          <p className="text-slate-500 font-bold tracking-tight italic mt-1 text-sm">
             Calibrating the pleasure-pain balance to reclaim neurochemical focus, inspired by <span className="text-slate-900 font-extrabold uppercase">Dopamine Nation</span>.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setIsInfoOpen(true)}
            className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-2"
          >
             <Info size={14} className="text-amber-600" />
             Neurochemical Science
          </button>
          
          <button 
            onClick={() => setIsAddingHabit(true)}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-slate-850 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
          >
             <PlusCircle size={16} />
             Add Metric Tracker
          </button>
        </div>
      </div>

      {/* Interactive Science Modal */}
      <AnimatePresence>
        {isInfoOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-xs flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 md:p-10 w-full max-w-2xl border border-slate-200 relative shadow-2xl overflow-y-auto max-h-[85vh]"
            >
              <button 
                onClick={() => setIsInfoOpen(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <Brain className="text-indigo-600" size={32} />
                <h3 className="text-xl font-black leading-none uppercase tracking-tight text-indigo-950">
                  The Neuroscience of Balance
                </h3>
              </div>

              <div className="space-y-4 text-slate-700 text-xs md:text-sm font-medium leading-relaxed">
                <p>
                  In <strong className="text-indigo-900">“Dopamine Nation,”</strong> Dr. Anna Lembke explains that pleasure and pain are co-localized in the brain and function like a <strong>pleasure-pain balance scale</strong>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                    <h4 className="font-black text-rose-800 uppercase text-xs mb-1 flex items-center gap-1">
                      🔴 Left Side: High-Dopamine Gratif.
                    </h4>
                    <p className="text-[11px] text-rose-700 font-bold">
                      Scrolling feeds, streaming videos, gambling, sugars. Inputs are instant. The balance tips heavily to pleasure, but the brain compensates by putting weights on the pain side (craving/anxiety).
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <h4 className="font-black text-emerald-800 uppercase text-xs mb-1 flex items-center gap-1">
                      🟢 Right Side: High-Effort Resist.
                    </h4>
                    <p className="text-[11px] text-emerald-700 font-bold">
                      Exercise, cold exposure, reading, tidying, coding. Choosing difficult things first tilts the balance to pain. The brain compensates by naturally weighting the pleasure side afterwards!
                    </p>
                  </div>
                </div>
                <p>
                  By creating strict numerical caps on instant gratification (Dopamine Limits) and targets on hard tasks (Effort Targets), you reset your baseline to appreciate humble joys, achieve supreme focus, and defeat dopamine depletion.
                </p>
                <div className="p-4 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex gap-3 text-[11px] text-indigo-950">
                  <Info size={16} className="text-indigo-600 shrink-0" />
                  <span>
                    <strong>How to use this tracker:</strong> Fill in your weekly caps, log your daily numbers dynamically, check your homeostatic balance scale, and track your metrics over time!
                  </span>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setIsInfoOpen(false)}
                  className="px-6 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT TWO COLUMNS: Weekly Time Loggers and Lists */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Calendar Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
            <button 
              onClick={handlePrevWeek}
              className="p-3 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="text-center">
              <span className="block text-[10px] font-black uppercase tracking-widest text-[#a0aec0]">
                WEEK VIEW
              </span>
              <span className="text-sm font-black text-[#1B254B] mt-1 block">
                {format(startOfCurrentWeek, 'MMM dd, yyyy')} — {format(addDays(startOfCurrentWeek, 6), 'MMM dd, yyyy')}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={handleToday}
                className="px-3.5 py-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-[#1B254B] transition-colors"
              >
                Today
              </button>
              <button 
                onClick={handleNextWeek}
                className="p-3 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors"
                title="Next Week"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Metric Habits List Grid */}
          <div className="space-y-6">
            {habits.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-300">
                <Sliders size={48} className="mx-auto mb-4 stroke-[1px] text-slate-400" />
                <h3 className="font-black text-slate-700 text-lg uppercase tracking-tight">
                  No Advanced Metrics Added
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  Click "Add Metric Tracker" to calibrate custom numeric behaviors (e.g. YouTube limits, Workout targets).
                </p>
              </div>
            ) : (
              habits.map((habit) => {
                const { dailyValues, total, average } = getWeeklyHabitStats(habit);
                const theme = DEFAULT_COLOR_THEMES.find(t => t.id === habit.color) || DEFAULT_COLOR_THEMES[0];
                
                // Calculate target status
                const isLimit = habit.goalType === 'limit';
                const hasGoal = habit.weeklyGoal !== undefined;
                const limitExceeded = hasGoal && isLimit && total > (habit.weeklyGoal || 0);
                const targetAchieved = hasGoal && !isLimit && total >= (habit.weeklyGoal || 0);

                return (
                  <motion.div 
                    layout
                    key={habit.id}
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 relative overflow-visible"
                  >
                    
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-50 mb-6">
                      <div className="flex items-start gap-3">
                        <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center font-black ${theme.bg}`}>
                          {habit.type === 'dopamine' ? <Zap size={16} /> : <Flame size={16} />}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900 leading-tight">
                            {habit.name}
                          </h3>
                          <div className="flex flex-wrap gap-2 items-center mt-1">
                            {habit.type === 'dopamine' ? (
                              <span className="text-[9px] font-black uppercase bg-rose-50 border border-rose-100 text-rose-700 px-2 py-0.5 rounded-lg tracking-wider">
                                🔴 Instant Gratification (Dopamine Cap)
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg tracking-wider">
                                🟢 High Effort (Resilience Builder)
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-bold uppercase">
                              Unit: {habit.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Goal and Controls */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">
                            Goal
                          </span>
                          <span className="text-xs font-black text-slate-700">
                            {hasGoal ? (
                              <>
                                {isLimit ? 'Limit' : 'Target'}: {habit.weeklyGoal} {habit.unit}
                              </>
                            ) : (
                              'Free Style'
                            )}
                          </span>
                        </div>

                        <div className="h-4.5 w-px bg-slate-200" />

                        <button 
                          onClick={() => setIsLoggingModalOpen(habit.id)}
                          className={`text-[9px] font-black uppercase px-2.5 py-1.5 bg-[#f3f4f6] text-slate-[#1b254b] hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1`}
                          title="Quick Log"
                        >
                          <Sliders size={12} className="text-slate-500" /> Log
                        </button>

                        <button 
                          onClick={() => handleDeleteHabit(habit.id)}
                          className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Metric"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Numeric Days Grid */}
                    <div id={`daily-slider-grid-${habit.id}`} className="grid grid-cols-7 gap-2 my-4">
                      {dailyValues.map(({ day, val }) => {
                        const isToday = checkIsToday(day);
                        return (
                          <div 
                            key={day.toISOString()} 
                            className={`p-2.5 rounded-2xl flex flex-col items-center justify-between min-h-[75px] border transition-all ${
                              isToday 
                                ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950 font-black shadow-inner' 
                                : 'bg-slate-50/60 border-slate-100 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-[9.5px] uppercase font-black tracking-widest opacity-60">
                              {format(day, 'EEE')}
                            </span>
                            
                            {/* Inline value with direct visual feedback */}
                            <div className="my-1.5 flex items-center justify-center">
                              <input 
                                type="number"
                                min="0"
                                value={val === 0 ? '' : val}
                                onChange={(e) => handleLogValue(habit.id, day, e.target.value)}
                                placeholder="0"
                                className="w-11 text-center bg-transparent text-sm font-black text-slate-900 outline-none select-all placeholder:text-slate-300 focus:text-indigo-600 font-mono"
                              />
                            </div>
                            
                            <span className="text-[8px] font-bold text-slate-400 capitalize truncate w-full text-center">
                              {format(day, 'MMM d')}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer Calculated totals */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-50">
                      
                      {/* Metric calculation totals */}
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="block text-[8px] font-black uppercase text-slate-400">
                            Weekly Total Accumulated
                          </span>
                          <span className="text-md font-black text-indigo-950">
                            {formatMetric(total, habit.unit)}
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div>
                          <span className="block text-[8px] font-black uppercase text-slate-400">
                            Daily Avg
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            {Math.round(average * 10) / 10} {habit.unit}/day
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar & Badges */}
                      {hasGoal && (
                        <div className="flex-1 max-w-xs space-y-1.5">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-wide">
                            <span>Progress</span>
                            <span className={limitExceeded ? 'text-red-500' : targetAchieved ? 'text-emerald-500' : 'text-slate-500'}>
                              {Math.round((total / (habit.weeklyGoal || 1)) * 100)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                limitExceeded 
                                  ? 'bg-rose-500' 
                                  : targetAchieved 
                                    ? 'bg-emerald-500' 
                                    : theme.activeBg
                              }`}
                              style={{ width: `${Math.min(100, (total / (habit.weeklyGoal || 1)) * 100)}%` }}
                            />
                          </div>

                          {/* Quick motivational evaluation feedback */}
                          <div className="flex justify-end pr-0.5">
                            {isLimit ? (
                              limitExceeded ? (
                                <span className="text-[8.5px] font-black text-rose-600 uppercase flex items-center gap-0.5">
                                  <ShieldAlert size={10} /> Limit exceeded! Consider fasting!
                                </span>
                              ) : (
                                <span className="text-[8.5px] font-black text-emerald-600 uppercase flex items-center gap-0.5">
                                  <CheckCircle2 size={10} /> Safe zone: below limit scale
                                </span>
                              )
                            ) : (
                              targetAchieved ? (
                                <span className="text-[8.5px] font-black text-emerald-600 uppercase flex items-center gap-0.5">
                                  <CheckCircle2 size={10} /> Goal Achieved! Receptors reset!
                                </span>
                              ) : (
                                <span className="text-[8.5px] font-black text-slate-400 uppercase">
                                   Unfinished: {Math.max(0, (habit.weeklyGoal || 0) - total)} {habit.unit} to go
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Popover Logger Dialog */}
                    <AnimatePresence>
                      {isLoggingModalOpen === habit.id && (
                        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between border border-indigo-100 shadow-xl">
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                                <Sliders size={14} className="text-indigo-600" /> Log Value for {habit.name}
                              </h4>
                              <button onClick={() => setIsLoggingModalOpen(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-800 transition-colors">
                                <X size={16} />
                              </button>
                            </div>
                            
                            <p className="text-[11px] text-slate-400 font-bold mb-4">
                              Input numeric stats directly for each day of the current week view. Values save instantly.
                            </p>

                            <div className="space-y-3 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
                              {dailyValues.map(({ day, val }) => (
                                <div key={day.toISOString()} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-xl">
                                  <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                                    <span className="w-12 text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 py-0.5 px-2 rounded">
                                      {format(day, 'EEEE')}
                                    </span>
                                    <span>{format(day, 'MMM dd')}</span>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={val || ''}
                                      onChange={(e) => handleLogValue(habit.id, day, e.target.value)}
                                      className="w-18 px-3 py-1.5 border border-slate-200 focus:border-indigo-500 outline-none rounded-lg text-xs font-black text-right block"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 capitalize min-w-[50px]">{habit.unit}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end pt-4 border-t border-slate-50">
                            <button 
                              onClick={() => setIsLoggingModalOpen(null)}
                              className="px-4 py-2 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-700"
                            >
                              Done Logging
                            </button>
                          </div>
                        </div>
                      )}
                    </AnimatePresence>

                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Neurochemical scale and resets */}
        <div className="space-y-6">
          
          {/* INTERACTIVE PLEASURE-PAIN BALANCE BOARD */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-black text-[#1b254b] leading-none uppercase text-xs flex items-center gap-2 mb-2">
              <Scale size={16} className="text-indigo-600" />
              Receptor Balance Scale
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mb-6">
              A visual projection of the co-localized pleasure & pain balance inside your brain. Keep it aligned or effort-leaning.
            </p>

            {/* Visual Balance scale canvas animation */}
            <div className="relative h-44 flex flex-col justify-end items-center my-4 overflow-visible">
              
              {/* Balance Beam line */}
              <div 
                className="w-full h-1 bg-slate-900 rounded-full transition-transform duration-700 relative origin-center"
                style={{ transform: `rotate(${tiltAngle}deg)` }}
              >
                
                {/* Platter Left: Instant Gratification */}
                <div className="absolute left-4 -top-1 w-fit flex flex-col items-center origin-center" style={{ transform: `rotate(${-tiltAngle}deg)` }}>
                  <div className="w-1 bg-[#1b254b]/10 h-7" />
                  <div className="bg-rose-500 text-white rounded-2xl py-2 px-3 text-[10px] font-black uppercase text-center shadow-md min-w-[75px]">
                    Pleasure
                    <span className="block text-[8px] opacity-75 font-mono">{Math.round(balanceSums.dopaminePoints * 10) / 10} pts</span>
                  </div>
                </div>

                {/* Platter Right: Long effort */}
                <div className="absolute right-4 -top-1 w-fit flex flex-col items-center origin-center" style={{ transform: `rotate(${-tiltAngle}deg)` }}>
                  <div className="w-1 bg-[#1b254b]/10 h-7" />
                  <div className="bg-emerald-500 text-white rounded-2xl py-2 px-3 text-[10px] font-black uppercase text-center shadow-md min-w-[75px]">
                    Pain/Effort
                    <span className="block text-[8px] opacity-75 font-mono">{Math.round(balanceSums.effortPoints * 10) / 10} pts</span>
                  </div>
                </div>

                {/* Arrow Pointer */}
                <div className="absolute left-1/2 -top-4 w-0.5 h-4 bg-slate-900 -translate-x-1/2 origin-bottom" />

              </div>

              {/* Fulcrum base */}
              <div className="w-10 h-10 border-b-[24px] border-b-slate-900 border-x-[16px] border-x-transparent" />
            </div>

            {/* Status indicators */}
            <div className="p-4 rounded-2xl border bg-slate-50 flex flex-col items-center text-center mt-6">
              {tiltAngle < -3 ? (
                <>
                  <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider flex items-center gap-1 mb-1 animate-pulse">
                    <ShieldAlert size={12} /> Gratification Overdrive
                  </span>
                  <p className="text-[11px] text-slate-500 font-bold leading-normal">
                    The scale favors instant pleasure. Your brain will down-regulate dopamine, yielding anxiety/exhaustion. Introduce standard resilience effort!
                  </p>
                </>
              ) : tiltAngle > 3 ? (
                <>
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1 mb-1">
                    <CheckCircle2 size={12} /> Hormetic Resilient Base
                  </span>
                  <p className="text-[11px] text-slate-500 font-bold leading-normal">
                    You have done hard things first. This triggers slow, lasting neurochemical satisfaction and supreme clarity. Keep weighting this side.
                  </p>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1 mb-1">
                    <Gauge size={12} /> Homeostatic Flatline
                  </span>
                  <p className="text-[11px] text-slate-500 font-bold leading-normal">
                    Chemistry is balanced. You feel steady, content, and highly responsive. Avoid visual binges to preserve your baseline.
                  </p>
                </>
              )}
            </div>

          </div>

          {/* DOPAMINE RESET FAST / FAST CHALLENGE CARD */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
            
            {/* Background design accents */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-50 rounded-full -z-10 opacity-30" />

            <h3 className="font-black text-[#1b254b] leading-none uppercase text-xs flex items-center gap-2 mb-2">
              <Hourglass size={16} className="text-indigo-600 animate-spin-slow" />
              Dopamine Fasting reset
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mb-6">
              Do a 24-Hour to 30-Day receptor purification and cure cravings. Avoid scrolling files, junk inputs, and binge habits.
            </p>

            {!fastingState.isActive ? (
              <div className="space-y-4">
                <p className="text-[11.5px] text-slate-600 font-medium leading-relaxed">
                  Ready to lock your brain and clean out receptor fatigue? Select a detox time limit and embark on the reset protocol.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '24 Hours', days: 1 },
                    { label: '3 Days', days: 3 },
                    { label: '7 Days', days: 7 },
                    { label: '30 Days', days: 30 }
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      onClick={() => handleStartResetFast(preset.days)}
                      className="py-3 bg-slate-50 border border-slate-200/50 hover:border-indigo-300 hover:bg-slate-100/55 rounded-2xl text-[10px] font-black uppercase text-slate-[#1b254b] transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Visual Circular Active Fast Indicator */}
                <div className="p-4 border border-indigo-50 bg-indigo-50/15 rounded-2xl flex items-center justify-between mb-4">
                  <div>
                    <span className="block text-[8px] font-black uppercase text-indigo-600 tracking-widest">
                      CHALLENGE STATUS
                    </span>
                    <span className="text-md font-black text-indigo-950 uppercase block mt-0.5">
                      Fast in Progress
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 capitalize block">
                      Goal duration: {fastingState.durationDays} {fastingState.durationDays === 1 ? 'Day' : 'Days'}
                    </span>
                  </div>
                  
                  {/* Glowing Flame indicator */}
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center animate-pulse border border-indigo-200">
                    <Flame className="text-indigo-600" size={20} />
                  </div>
                </div>

                {/* Sub Tab View selectors */}
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  <button 
                    onClick={() => setActiveFastingTab('tracker')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase ${activeFastingTab === 'tracker' ? 'bg-white text-slate-800 shadow' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    Detox Coach
                  </button>
                  <button 
                    onClick={() => setActiveFastingTab('reflections')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase ${activeFastingTab === 'reflections' ? 'bg-white text-slate-800 shadow' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    Notes ({fastingState.reflections?.length || 0})
                  </button>
                </div>

                {activeFastingTab === 'tracker' ? (
                  <div className="space-y-3 pt-2">
                    <p className="text-[11px] text-slate-500 font-bold leading-normal">
                      🛡️ <strong className="text-indigo-950 uppercase">Prohibited Inputs during Detox:</strong> Quick gratification videos, adult feeds, gaming apps, gambling logs, binge scrolling formats.
                    </p>
                    <p className="text-[11px] text-slate-500 font-bold leading-normal">
                      🔥 <strong className="text-indigo-950 uppercase">Recommended Habits during Detox:</strong> Solid paper books, slow writing, tidying archives, cold nature showers, long endurance walks.
                    </p>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={handleStopResetFast}
                        className="flex-1 py-3 border border-slate-200 text-[#1b254b]/40 hover:bg-slate-50 transition-colors uppercase font-black text-[9px] tracking-widest rounded-2xl"
                      >
                        Abandon
                      </button>
                      <button 
                        onClick={handleCompleteResetFast}
                        className="flex-1 py-3 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors uppercase font-black text-[9px] tracking-widest rounded-2xl flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/10"
                      >
                        <Check size={12} /> Succeed Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    
                    {/* Reflections history logger slider */}
                    <div className="max-h-[140px] overflow-y-auto no-scrollbar space-y-2 pr-1">
                      {(!fastingState.reflections || fastingState.reflections.length === 0) ? (
                        <p className="text-center text-[10px] text-slate-350 italic font-bold py-6">
                          No thoughts logged yet. Record your urges or clarity when they hit.
                        </p>
                      ) : (
                        fastingState.reflections.map((ref, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase text-indigo-600">
                              <span>Log Entry #{i+1}</span>
                              <span>{ref.date}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700 leading-normal">
                              {ref.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <textarea
                        value={newFastRef}
                        onChange={(e) => setNewFastRef(e.target.value)}
                        placeholder="Log any cravings, boredom, or focus sessions..."
                        className="flex-1 h-14 bg-slate-50 rounded-xl border border-slate-200 outline-none p-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 placeholder:italic resize-none"
                      />
                      <button 
                        onClick={handleAddFastReflection}
                        disabled={!newFastRef.trim()}
                        className="px-3 shrink-0 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-indigo-700 select-none disabled:opacity-50"
                      >
                        Log
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

      {/* COGNITIVE BEHAVIORAL HABIT REFRAMER TABLE (CBT) */}
      <div className="max-w-7xl mx-auto mt-12 bg-white/40 backdrop-blur-3xl rounded-[36px] p-6 md:p-8 border border-slate-200/65 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-[#1b254b]/50 block mb-1">COGNITIVE BEHAVIORAL PROTOCOL</span>
            <h2 className="text-2xl md:text-3xl font-black text-[#1b254b] uppercase italic tracking-tighter flex items-center gap-2">
              🧠 Habit Trigger & Cognitive Reframing Board
            </h2>
            <p className="text-xs font-bold text-slate-500 leading-normal max-w-2xl mt-1">
              Analyze mental triggers, emotions, and original intentions vs actual outcomes. Formulate proactive, actionable alternatives when problems arise to rewire behavioral loops.
            </p>
          </div>
          <button
            onClick={() => setIsAddingReframer(true)}
            className="self-start md:self-center px-5 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-slate-900/10 group"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform" />
            Analyze Trigger Loop
          </button>
        </div>

        {/* QUESTION SAMPLES EXPLORER */}
        <div className="mb-8 p-6 bg-slate-50 border border-slate-150 rounded-[28px] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                📋 Reframer Guidance & Question Samples
              </h3>
              <p className="text-[11px] text-slate-500 font-bold leading-normal">
                See how questions adapt based on the selected individual's short name to explore behavioral triggers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Preview name:</span>
              <select 
                id="demo-student-select"
                className="bg-white border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl text-slate-850 outline-none cursor-pointer"
                onChange={(e) => {
                  setPreviewName(e.target.value);
                }}
                value={previewName}
              >
                <option value="Self">Self (You)</option>
                {data.students?.slice(0, 15).map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl relative">
              <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider">Situation & Thought</span>
              <p className="text-[11px] text-slate-500 font-bold mt-1.5 leading-relaxed italic">
                "What crossed {getSubjectShortName(previewName)}'s mind right before the action?"
              </p>
              <span className="text-[9px] font-black uppercase text-slate-400 block mt-2">Sample question:</span>
              <p className="text-[10.5px] text-slate-650 font-semibold leading-normal block mt-0.5">
                "Identify what automated thought or rationalization occurred in {getSubjectShortName(previewName)}."
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl">
              <span className="text-[9px] font-black uppercase text-purple-700 tracking-wider">Emotion & Feeling</span>
              <p className="text-[11px] text-slate-500 font-bold mt-1.5 leading-relaxed italic">
                "What core emotional state did {getSubjectShortName(previewName)} experience?"
              </p>
              <span className="text-[9px] font-black uppercase text-slate-400 block mt-2">Sample question:</span>
              <p className="text-[10.5px] text-slate-650 font-semibold leading-normal block mt-0.5">
                "Describe the feel of the urge state and its core intensity for {getSubjectShortName(previewName)}."
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl">
              <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">Original Intention</span>
              <p className="text-[11px] text-slate-500 font-bold mt-1.5 leading-relaxed italic">
                "What was {getSubjectShortName(previewName)}'s healthy, original objective?"
              </p>
              <span className="text-[9px] font-black uppercase text-slate-400 block mt-2">Sample question:</span>
              <p className="text-[10.5px] text-slate-650 font-semibold leading-normal block mt-0.5">
                "What safety, pleasure, or positive relief did {getSubjectShortName(previewName)} seek before the shortcut?"
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl">
              <span className="text-[9px] font-black uppercase text-rose-700 tracking-wider">Actual Outcome</span>
              <p className="text-[11px] text-slate-500 font-bold mt-1.5 leading-relaxed italic">
                "What actually happened after the trigger situation?"
              </p>
              <span className="text-[9px] font-black uppercase text-slate-400 block mt-2">Sample question:</span>
              <p className="text-[10.5px] text-slate-650 font-semibold leading-normal block mt-0.5">
                "Detail what actions were taken and describe {getSubjectShortName(previewName)}'s real feeling afterward."
              </p>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-150 rounded-2xl border-l-4 border-emerald-500">
              <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider">Pivot (Instead?)</span>
              <p className="text-[11px] text-emerald-750 font-bold mt-1.5 leading-relaxed italic animate-pulse">
                "What can {getSubjectShortName(previewName)} do instead when triggers return?"
              </p>
              <span className="text-[9px] font-black uppercase text-emerald-600 block mt-2">Sample question:</span>
              <p className="text-[10.5px] text-emerald-950 font-black leading-normal block mt-0.5">
                "What concrete, high-effort alternative strategy can {getSubjectShortName(previewName)} commit to?"
              </p>
            </div>
          </div>
        </div>

        {/* Guided prompt cards (Compact Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-slate-50/50 p-4 rounded-[24px] border border-slate-200/50">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">💡 1. DETECT TRIGGERS</span>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Identify situations, cues, or automatic thoughts that trigger habit desires.
            </p>
          </div>
          <div className="space-y-1 border-t md:border-t-0 md:border-x border-slate-200/60 pt-2.5 md:pt-0 md:px-4">
            <span className="text-[9px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">🎭 2. INTENTION VS OUTCOME</span>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Examine the tension between healthy motivations and regret-inducing behaviors.
            </p>
          </div>
          <div className="space-y-1 border-t md:border-t-0 pt-2.5 md:pt-0">
            <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1">🔄 3. DISCIPLINE PIVOT</span>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Formulate concrete alternative steps when problems arise to change your routines.
            </p>
          </div>
        </div>

        {/* The Records Table (Desktop) / Cards (Mobile) */}
        {(!data.habitReframers || data.habitReframers.length === 0) ? (
          <div className="py-16 text-center text-slate-400">
            <Sliders size={48} className="mx-auto mb-3 opacity-25 text-slate-500" />
            <p className="font-black text-[11px] uppercase tracking-[0.2em] italic text-[#1b254b]/60">Alignment desk is empty</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Add your first mental trigger loop assessment to build awareness.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Strictly 7 columns) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-4 px-4 w-[12%]">Individual</th>
                    <th className="py-4 px-4 w-[11%]">Date & Time</th>
                    <th className="py-4 px-4 w-[20%]">Cognitive Trigger (Thought)</th>
                    <th className="py-4 px-4 w-[14%]">Feeling / Urge</th>
                    <th className="py-4 px-4 w-[14%]">Healthy Intention</th>
                    <th className="py-4 px-4 w-[13%]">Actual Outcome</th>
                    <th className="py-4 px-4 w-[16%]">Discipline Pivot (Instead?)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-850">
                  {data.habitReframers.map((record) => {
                    const isExpanded = expandedRecordId === record.id;
                    return (
                      <React.Fragment key={record.id}>
                        <tr className="hover:bg-slate-50/70 transition-colors group">
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1.5 items-start">
                              <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-[10px] font-black uppercase">
                                👤 {record.studentName || 'Self'}
                              </span>
                              <button
                                onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-[#1b254b]/60 hover:bg-slate-200/80'}`}
                              >
                                {isExpanded ? 'Collapse ▲' : record.isFullDopamineAudit ? '📊 Review Audit' : '👁️ View Loop'}
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-slate-400 leading-relaxed text-[11px]">
                            {format(new Date(record.date), 'MMM dd, HH:mm')}
                          </td>
                          <td className="py-4 px-4 font-sans text-slate-900 font-medium leading-relaxed max-w-[200px] truncate" title={record.thought}>
                            {record.thought}
                          </td>
                          <td className="py-4 px-4 leading-relaxed max-w-[140px] truncate" title={record.feeling}>
                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-500/10 text-amber-800 rounded-lg text-[10px] font-black uppercase tracking-tight">
                              {record.feeling}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-emerald-800 leading-relaxed font-semibold max-w-[140px] truncate" title={record.intention}>
                            {record.intention}
                          </td>
                          <td className="py-4 px-4 text-rose-600 leading-relaxed font-semibold max-w-[130px] truncate" title={record.actualOutcome}>
                            {record.actualOutcome}
                          </td>
                          <td className="py-4 px-4 bg-emerald-50/10 leading-relaxed font-semibold rounded-lg border-l-2 border-emerald-400 relative">
                            <div className="flex justify-between items-start gap-1 pr-6">
                              <span className="text-emerald-950 font-bold block max-w-[125px] truncate" title={record.alternativeStrategy}>
                                {record.alternativeStrategy}
                              </span>
                              <button
                                onClick={() => handleDeleteReframer(record.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Delete record"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED DETAILED REPORT BENTO CARD (DESKTOP) */}
                        {isExpanded && (
                          <tr className="bg-slate-50/65">
                            <td colSpan={7} className="py-6 px-8 border-b border-slate-200">
                              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">📊</span>
                                    <div>
                                      <h4 className="text-sm font-black text-[#1b254b] uppercase tracking-wider">
                                        {record.isFullDopamineAudit ? 'Comprehensive D.O.P.A.M.I.N.E. Alignment Ledger' : 'Trigger Loop Reflection Record'}
                                      </h4>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        Subject: {record.studentName || 'Self'} • Logged At {format(new Date(record.date), 'MMMM dd, yyyy HH:mm')}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase">
                                    Format: {record.isFullDopamineAudit ? '8-Step Workbook' : 'Quick Loop'}
                                  </span>
                                </div>

                                {record.isFullDopamineAudit ? (
                                  <div className="space-y-6">
                                    {/* D & O */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* D = DATA */}
                                      <div className="p-4 bg-indigo-50/25 border border-indigo-100 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">D</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider block">D. DATA (SHUTOUT REPAIR)</span>
                                          <p className="text-xs font-bold text-slate-800 mt-1 leading-relaxed">
                                            {record.substanceOrBehavior}
                                          </p>
                                          {record.frequencyAndAmount && (
                                            <span className="inline-block mt-1.5 bg-indigo-100/60 text-indigo-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-md">
                                              ⏰ Frequency: {record.frequencyAndAmount}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* O = OBJECTIVES */}
                                      <div className="p-4 bg-sky-50/25 border border-sky-100 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0">O</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-sky-800 tracking-wider block">O. OBJECTIVES (MIND MOTIVE)</span>
                                          <p className="text-xs font-medium text-slate-700 mt-1 leading-relaxed">
                                            {record.objectives || 'No motive data logged.'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* P = PROBLEMS METRICS */}
                                    <div className="p-5 bg-rose-50/15 border border-rose-100 rounded-2xl space-y-4">
                                      <div className="flex gap-2 items-center">
                                        <span className="w-8 h-8 rounded-xl bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">P</span>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider block">P. PROBLEMS MATRIX (Exploring Impacts and Costs)</span>
                                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Corroborated 6 dimensional problem checks</span>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Neuroadaptation */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-rose-700 flex items-center gap-1">🌀 Neuroadaptation</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pNeuroadaptation || 'None reported or minimal tolerance change.'}
                                          </p>
                                        </div>
                                        {/* Relationships */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-amber-700 flex items-center gap-1">👥 Relationship Boundaries</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pRelationships || 'None reported or healthy.'}
                                          </p>
                                        </div>
                                        {/* Work/School */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-indigo-700 flex items-center gap-1">💼 Work & Study</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pWork || 'None reported or high productive flow.'}
                                          </p>
                                        </div>
                                        {/* Financial */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-[#1a5f7a] flex items-center gap-1">💳 Financial Waste</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pFinancial || 'None reported or no overspending.'}
                                          </p>
                                        </div>
                                        {/* Health */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-red-700 flex items-center gap-1">❤️ Sleep & Physical Health</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pHealth || 'None reported or steady wellness.'}
                                          </p>
                                        </div>
                                        {/* Spiritual */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-[#4d4d4d] flex items-center gap-1">✨ Spiritual Integrity</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pSpiritual || 'None reported or aligned with ethics.'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* A, M, I */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {/* A = ABSTINENCE */}
                                      <div className="p-4 bg-amber-50/20 border border-amber-100 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">A</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">A. ABSTINENCE reset</span>
                                          <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">
                                            {record.abstinencePlan || 'None reported.'}
                                          </p>
                                        </div>
                                      </div>

                                      {/* M = MINDFULNESS */}
                                      <div className="p-4 bg-purple-50/20 border border-purple-100 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">M</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-purple-800 tracking-wider block">M. MINDFULNESS waves</span>
                                          <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">
                                            {record.mindfulnessNotes || 'None reported.'}
                                          </p>
                                        </div>
                                      </div>

                                      {/* I = INSIGHT */}
                                      <div className="p-4 bg-teal-50/20 border border-teal-100 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0">I</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-teal-800 tracking-wider block">I. INSIGHT & HONESTY</span>
                                          <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">
                                            {record.insightHonesty || 'None reported.'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* N & E */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* N = NEXT STEPS */}
                                      <div className="p-4 bg-slate-100/50 border border-slate-200 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-slate-700 text-white font-black text-xs flex items-center justify-center shrink-0">N</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider block">N. NEXT STEPS (MODERATION RULES)</span>
                                          <p className="text-xs font-black text-slate-800 mt-1 leading-relaxed">
                                            {record.nextStepsPlan || 'None reported.'}
                                          </p>
                                        </div>
                                      </div>

                                      {/* E = EXPERIMENT */}
                                      <div className="p-4 bg-emerald-50/30 border border-emerald-150 rounded-2xl border-l-4 border-l-emerald-500 flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">E</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block font-black">E. EXPERIMENT (ACTIVE HORMESIS)</span>
                                          <p className="text-xs font-black text-emerald-950 mt-1 leading-relaxed">
                                            {record.experimentRules || record.alternativeStrategy}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  /* QUICK REFLECTION MATRIX VIEW */
                                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                                      <span className="text-[9px] font-black text-slate-400 uppercase">1. Trigger Thought</span>
                                      <p className="text-xs font-semibold text-slate-800 leading-normal">{record.thought}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                                      <span className="text-[9px] font-black text-slate-400 uppercase">2. Emotional Core</span>
                                      <p className="text-xs font-semibold text-slate-850 leading-normal">{record.feeling}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                                      <span className="text-[9px] font-black text-emerald-700 uppercase">3. Objective Intention</span>
                                      <p className="text-xs font-semibold text-emerald-900 leading-normal">{record.intention}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                                      <span className="text-[9px] font-black text-rose-700 uppercase">4. Outcome</span>
                                      <p className="text-xs font-semibold text-rose-900 leading-normal">{record.actualOutcome}</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl space-y-1 border-l-4 border-emerald-505">
                                      <span className="text-[9px] font-black text-emerald-800 uppercase block">5. Active Discipline Pivot</span>
                                      <p className="text-xs font-black text-emerald-950 leading-normal">{record.alternativeStrategy}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stack View */}
            <div className="block md:hidden space-y-4">
              {data.habitReframers.map((record, index) => {
                const isExpanded = expandedRecordId === record.id;
                return (
                  <div key={record.id} className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden space-y-4">
                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500/35"></div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          👤 {record.studentName || 'Self'} • Entry #{data.habitReframers!.length - index}
                        </span>
                        <span className="text-[9px] font-bold text-slate-405 font-mono">
                          {format(new Date(record.date), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                          className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                        >
                          {isExpanded ? 'Collapse' : 'Details'}
                        </button>
                        <button
                          onClick={() => handleDeleteReframer(record.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {!isExpanded ? (
                      /* COLLAPSED INSTANCE CARD */
                      <div className="space-y-3 font-semibold text-xs text-slate-700 pt-1">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">BEHAVIOR / COGNITIVE TRIGGER</span>
                          <p className="text-slate-900 leading-relaxed font-bold">{record.thought}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">URGE / INTENSITY</span>
                            <span className="inline-block px-2.5 py-0.5 bg-amber-500/10 text-amber-800 rounded-lg text-[10px] font-black uppercase">
                              {record.feeling}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">INTENTION</span>
                            <p className="text-emerald-700 leading-relaxed font-bold">{record.intention}</p>
                          </div>
                        </div>

                        <div className="p-3 bg-emerald-50/30 rounded-xl border-l-2 border-emerald-500">
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 block mb-0.5">PIVOT RULE</span>
                          <p className="text-slate-900 font-bold leading-relaxed">{record.alternativeStrategy}</p>
                        </div>
                      </div>
                    ) : (
                      /* EXPANDED FULL DOPAMINE LEDGER (MOBILE) */
                      <div className="space-y-4 pt-1 divide-y divide-slate-100 text-xs font-semibold">
                        {record.isFullDopamineAudit ? (
                          <div className="space-y-4">
                            {/* D */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-indigo-700 uppercase tracking-widest block mb-0.5">D. DATA (BEHAVIOR)</span>
                              <p className="text-slate-900 font-black text-xs leading-normal">{record.substanceOrBehavior}</p>
                              {record.frequencyAndAmount && (
                                <span className="inline-block bg-indigo-50 text-indigo-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-md mt-1">
                                  ⏰ {record.frequencyAndAmount}
                                </span>
                              )}
                            </div>
                            {/* O */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-sky-700 uppercase tracking-widest block mb-0.5">O. OBJECTIVES</span>
                              <p className="text-slate-700 font-medium leading-relaxed">{record.objectives || 'No details'}</p>
                            </div>
                            {/* P */}
                            <div className="pt-2 space-y-2">
                              <span className="text-[9.5px] font-black text-rose-700 uppercase tracking-widest block">P. EXPLORED PROBLEMS MATRIX</span>
                              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-150 space-y-2.5">
                                <div>
                                  <span className="text-[9px] font-black uppercase text-rose-600 block">🌀 Neuroadaptation</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pNeuroadaptation || 'Healthy'}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase text-amber-600 block">👥 Relationships</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pRelationships || 'Healthy'}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase text-indigo-600 block">💼 Work & Productivity</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pWork || 'Healthy'}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase text-[#1a5f7a] block">💳 Financial cost</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pFinancial || 'Healthy'}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase text-red-600 block">❤️ Physical health / Sleep</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pHealth || 'Healthy'}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase text-[#4d4d4d] block">✨ Spiritual & Values alignment</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pSpiritual || 'Healthy'}</p>
                                </div>
                              </div>
                            </div>
                            {/* A */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-amber-700 uppercase tracking-widest block mb-0.5">A. ABSTINENCE FOCUS</span>
                              <p className="text-slate-700 leading-normal">{record.abstinencePlan || 'No details'}</p>
                            </div>
                            {/* M */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-purple-700 uppercase tracking-widest block mb-0.5">M. MINDFULNESS WAVES</span>
                              <p className="text-slate-700 leading-normal">{record.mindfulnessNotes || 'No details'}</p>
                            </div>
                            {/* I */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-teal-700 uppercase tracking-widest block mb-0.5">I. INSIGHT & HONEST EXCUSES</span>
                              <p className="text-slate-700 leading-normal">{record.insightHonesty || 'No details'}</p>
                            </div>
                            {/* N */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-widest block mb-0.5">N. NEXT STEPS MODE</span>
                              <p className="text-slate-800 font-extrabold leading-normal">{record.nextStepsPlan || 'No details'}</p>
                            </div>
                            {/* E */}
                            <div className="pt-2 p-3 bg-emerald-50 rounded-xl border-l-2 border-emerald-500">
                              <span className="text-[9.5px] font-black text-emerald-800 uppercase tracking-widest block mb-0.5">E. ACTIVE EXPERIMENT TRIAL</span>
                              <p className="text-emerald-950 font-black leading-relaxed">{record.experimentRules || record.alternativeStrategy}</p>
                            </div>
                          </div>
                        ) : (
                          /* SHORT DETAILED EXPANSION FORM (MOBILE) */
                          <div className="space-y-2.5 pt-2">
                            <div>
                              <span className="text-[9px] font-black text-slate-400 block tracking-widest uppercase">1. Trigger thought</span>
                              <p className="text-slate-850 font-medium mt-0.5">{record.thought}</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black text-slate-400 block tracking-widest uppercase">2. Emotion urge</span>
                              <p className="text-slate-850 font-medium mt-0.5">{record.feeling}</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black text-emerald-700 block tracking-widest uppercase">3. Objective Intention</span>
                              <p className="text-emerald-900 font-bold mt-0.5">{record.intention}</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black text-rose-700 block tracking-widest uppercase">4. Real Outcome</span>
                              <p className="text-rose-950 font-bold mt-0.5">{record.actualOutcome}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 border-l-2 border-emerald-500 rounded-xl">
                              <span className="text-[9px] font-black text-emerald-800 block tracking-widest uppercase">5. Action pivot discipline</span>
                              <p className="text-emerald-950 font-black animate-pulse-slow mt-0.5">{record.alternativeStrategy}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* COGNITIVE REFRAMING DIALOG */}
      <AnimatePresence>
        {isAddingReframer && (() => {
          const modalSubjectId = reframerForm.studentId;
          const modalSubjectName = modalSubjectId ? data.students?.find(s => s.id === modalSubjectId)?.name : 'Self';
          const modalShortName = getSubjectShortName(modalSubjectName);

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`bg-white rounded-[36px] p-6 md:p-10 w-full ${reframerForm.isFullDopamineAudit ? 'max-w-4xl' : 'max-w-2xl'} border border-slate-200 relative my-6 shadow-2xl transition-all duration-300 max-h-[90vh] overflow-y-auto no-scrollbar`}
              >
                <button 
                  onClick={() => setIsAddingReframer(false)}
                  className="absolute top-6 right-6 md:top-8 md:right-8 text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-all"
                >
                  <X size={20} />
                </button>

                <div className="mb-6">
                  <span className="text-[9px] font-black uppercase text-[#1b254b]/50 tracking-widest block mb-1">BEHAVIORAL RE-ENGINEERING SYSTEM</span>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
                    {reframerForm.isFullDopamineAudit ? '📊 D.O.P.A.M.I.N.E. Complete Reset Audit' : '🧠 Cognitive Trigger & Core Loop Audit'}
                  </h3>
                  <p className="text-[11px] md:text-xs font-bold text-slate-550 leading-normal mt-1">
                    {reframerForm.isFullDopamineAudit 
                      ? `Follow Dr. Anna Lembke's complete 8-step framework to review, reset, and rebalance the pleasure-pain scales of ${modalShortName}.`
                      : `Recognize immediate triggers, emotion states, and map proactive pivot actions to redirect behaviors.`
                    }
                  </p>
                </div>

                {/* Mode Switcher */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-6">
                  <button
                    type="button"
                    onClick={() => setReframerForm({ ...reframerForm, isFullDopamineAudit: false })}
                    className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${!reframerForm.isFullDopamineAudit ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    <span>🧠 Core Trigger Loop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReframerForm({ ...reframerForm, isFullDopamineAudit: true })}
                    className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${reframerForm.isFullDopamineAudit ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    <span>📊 All-Type Problems (DOPAMINE Checklist)</span>
                  </button>
                </div>

                {/* Target Subject Selector */}
                <div className="space-y-1.5 mb-6">
                  <label className="text-[10px] font-black uppercase text-[#1b254b]/50 tracking-wider block ml-3">
                    Target Subject (Individual for this behavior)
                  </label>
                  <select
                    value={reframerForm.studentId}
                    onChange={(e) => setReframerForm({ ...reframerForm, studentId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer font-sans"
                  >
                    <option value="">General / Self (You)</option>
                    {data.students?.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>

                {/* THE MODE-SPECIFIC FIELDS */}
                {!reframerForm.isFullDopamineAudit ? (
                  /* SIMPLE CORE LOOP FORM */
                  <div className="space-y-4">
                    {/* Thought */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-[#1b254b]/55 tracking-wider block ml-3">
                        1. Automatic Thought / Trigger Situation (What crossed {modalShortName}'s mind?)
                      </label>
                      <textarea 
                        value={reframerForm.thought}
                        onChange={(e) => setReframerForm({ ...reframerForm, thought: e.target.value })}
                        placeholder={`e.g. "${modalShortName === 'you' ? "I'm too exhausted to work. I need an instant coffee or a video scrolling break." : modalShortName + " felt heavy and wanted a quick escape"}"`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all h-20 resize-none font-sans"
                      />
                    </div>

                    {/* Feeling Status */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-[#1b254b]/55 tracking-wider block ml-3">
                        2. Emotional Core & Urge Intensity of {modalShortName} (Boredom, Fatigue, Anxiety)
                      </label>
                      <input 
                        type="text"
                        value={reframerForm.feeling}
                        onChange={(e) => setReframerForm({ ...reframerForm, feeling: e.target.value })}
                        placeholder="e.g. Mild Boredom, Sluggish Fatigue, 8/10 Cravings"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Intention and Outcome side-by-side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-[#1b254b]/55 tracking-wider block ml-3">
                          3. Healthy Intention (What constructive need did {modalShortName} have?)
                        </label>
                        <textarea 
                          value={reframerForm.intention}
                          onChange={(e) => setReframerForm({ ...reframerForm, intention: e.target.value })}
                          placeholder="e.g. To relieve exhaustion without deep rabbit holes."
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all h-20 resize-none font-sans"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-[#1b254b]/55 tracking-wider block ml-3">
                          4. Actual Outcome (What actually happened?)
                        </label>
                        <textarea 
                          value={reframerForm.actualOutcome}
                          onChange={(e) => setReframerForm({ ...reframerForm, actualOutcome: e.target.value })}
                          placeholder="e.g. Ended up browsing short-clip reels for 55 minutes, felt highly regretful."
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all h-20 resize-none font-sans"
                        />
                      </div>
                    </div>

                    {/* Alternative Strategy */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block ml-3 font-extrabold animate-pulse">
                        5. What can {modalShortName} do instead when the problem arises? (Alternative Pivot)
                      </label>
                      <textarea 
                        value={reframerForm.alternativeStrategy}
                        onChange={(e) => setReframerForm({ ...reframerForm, alternativeStrategy: e.target.value })}
                        placeholder="e.g. Set a strict 5-min timer, stand up and drink a cold simple glass of water, or write down 2 paper index notes of reflection."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all h-21 resize-none border-l-4 border-emerald-500 font-sans"
                      />
                    </div>
                  </div>
                ) : (
                  /* COMPREHENSIVE D.O.P.A.M.I.N.E. WORKBOOK FORM */
                  <div className="space-y-6">
                    {/* D - DATA SECTION */}
                    <div className="p-5 bg-indigo-50/20 border border-indigo-100 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-indigo-100/50 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">D</span>
                        <h4 className="text-xs font-black text-[#1b254b] uppercase tracking-wider">Step 1: Data (Substance/Behavior Assessment)</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9.5px] font-black uppercase text-slate-500 ml-1">What is the shortcut behavior or substance?</label>
                          <input 
                            type="text"
                            value={reframerForm.substanceOrBehavior}
                            onChange={(e) => setReframerForm({ ...reframerForm, substanceOrBehavior: e.target.value })}
                            placeholder="e.g. Video bingeing, online slot rolling, high-caffeine sugar coffee, etc."
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9.5px] font-black uppercase text-slate-500 ml-1">Frequency & Intensity (How much / how often?)</label>
                          <input 
                            type="text"
                            value={reframerForm.frequencyAndAmount}
                            onChange={(e) => setReframerForm({ ...reframerForm, frequencyAndAmount: e.target.value })}
                            placeholder="e.g. 3-4 hours daily, every evening around 9 PM"
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* O - OBJECTIVES SECTION */}
                    <div className="p-5 bg-sky-50/25 border border-sky-100 rounded-3xl space-y-3">
                      <div className="flex items-center gap-2 border-b border-sky-100/50 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-sky-600 text-white font-black text-xs flex items-center justify-center">O</span>
                        <h4 className="text-xs font-black text-[#1b254b] uppercase tracking-wider">Step 2: Objectives (Why does {modalShortName} appeal to it?)</h4>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black uppercase text-slate-500 ml-1">
                          Briefly list the thoughts, feelings, or escape motives behind the act. What discomfort are you running from?
                        </label>
                        <textarea 
                          value={reframerForm.objectives}
                          onChange={(e) => setReframerForm({ ...reframerForm, objectives: e.target.value })}
                          placeholder="e.g. To escape severe mental blockages or fatigue or avoid thinking about difficult family tasks."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 h-16 resize-none font-sans"
                        />
                      </div>
                    </div>

                    {/* P - PROBLEMS COLUMN MATRIX (7-COLUMN CORROBORATION) */}
                    <div className="p-5 bg-rose-50/15 border border-rose-100 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-rose-200/55 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center">P</span>
                        <h4 className="text-xs font-black text-[#1b254b] uppercase tracking-wider">Step 3: Problems (Exploring All Types of Problems due to Use)</h4>
                      </div>
                      <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed italic ml-1">
                        Analyze how this habit or substance causes friction or triggers problems for {modalShortName} in these 6 core dimensions:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Neuroadaptation */}
                        <div className="space-y-1.5 p-3 bg-white border border-slate-150 rounded-2xl">
                          <label className="text-[9.5px] font-black uppercase text-rose-700 tracking-tight block">🌀 A. Neuroadaptation Problems (Tolerance, Withdrawal & Craving)</label>
                          <textarea 
                            value={reframerForm.pNeuroadaptation}
                            onChange={(e) => setReframerForm({ ...reframerForm, pNeuroadaptation: e.target.value })}
                            placeholder="e.g. Cravings get harder in the evening. Feeling moody and up & down without it."
                            className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 p-2 border border-slate-100 bg-slate-50 rounded-xl focus:bg-white outline-none focus:border-rose-400 h-16 resize-none"
                          />
                        </div>

                        {/* 2. Relationships */}
                        <div className="space-y-1.5 p-3 bg-white border border-slate-150 rounded-2xl">
                          <label className="text-[9.5px] font-black uppercase text-amber-700 tracking-tight block">👥 B. Relationship Problems & Boundary Breaches</label>
                          <textarea 
                            value={reframerForm.pRelationships}
                            onChange={(e) => setReframerForm({ ...reframerForm, pRelationships: e.target.value })}
                            placeholder="e.g. Snapping, hiding actual usage times from family, or withdrawing in conversations."
                            className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 p-2 border border-slate-100 bg-slate-50 rounded-xl focus:bg-white outline-none focus:border-rose-400 h-16 resize-none"
                          />
                        </div>

                        {/* 3. Work/School */}
                        <div className="space-y-1.5 p-3 bg-white border border-slate-150 rounded-2xl">
                          <label className="text-[9.5px] font-black uppercase text-indigo-700 tracking-tight block">💼 C. Work/School Problems & Efficiency Loss</label>
                          <textarea 
                            value={reframerForm.pWork}
                            onChange={(e) => setReframerForm({ ...reframerForm, pWork: e.target.value })}
                            placeholder="e.g. Extreme procrastination on main priorities, missing lessons/deadlines, low focus."
                            className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 p-2 border border-slate-100 bg-slate-50 rounded-xl focus:bg-white outline-none focus:border-rose-400 h-16 resize-none"
                          />
                        </div>

                        {/* 4. Financial */}
                        <div className="space-y-1.5 p-3 bg-white border border-slate-150 rounded-2xl">
                          <label className="text-[9.5px] font-black uppercase text-[#1a5f7a] tracking-tight block">💳 D. Financial Cost / Resource Waste</label>
                          <textarea 
                            value={reframerForm.pFinancial}
                            onChange={(e) => setReframerForm({ ...reframerForm, pFinancial: e.target.value })}
                            placeholder="e.g. Wasted real Cambodian KHR or dollars on instant coffee, subscriptions, or losing billable focus hours."
                            className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 p-2 border border-slate-100 bg-slate-50 rounded-xl focus:bg-white outline-none focus:border-rose-400 h-16 resize-none"
                          />
                        </div>

                        {/* 5. Health */}
                        <div className="space-y-1.5 p-3 bg-white border border-slate-150 rounded-2xl">
                          <label className="text-[9.5px] font-black uppercase text-red-700 tracking-tight block">❤️ E. Health & Physical Sufferings (Sleep, Sluggishness, Posture)</label>
                          <textarea 
                            value={reframerForm.pHealth}
                            onChange={(e) => setReframerForm({ ...reframerForm, pHealth: e.target.value })}
                            placeholder="e.g. Slouching posture, sleep-deprived bedtime at 1:30 AM, eye-burns, brain fog."
                            className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 p-2 border border-slate-100 bg-slate-50 rounded-xl focus:bg-white outline-none focus:border-rose-400 h-16 resize-none"
                          />
                        </div>

                        {/* 6. Spiritual */}
                        <div className="space-y-1.5 p-3 bg-white border border-slate-150 rounded-2xl">
                          <label className="text-[9.5px] font-black uppercase text-[#4d4d4d] tracking-tight block">✨ F. Spiritual & Deep Integrity / Inner Friction</label>
                          <textarea 
                            value={reframerForm.pSpiritual}
                            onChange={(e) => setReframerForm({ ...reframerForm, pSpiritual: e.target.value })}
                            placeholder="e.g. Going against core values of slow focus. Pretending I can handle all alone instead of accepting support."
                            className="w-full text-xs font-semibold text-slate-900 placeholder:text-slate-400 p-2 border border-slate-100 bg-slate-50 rounded-xl focus:bg-white outline-none focus:border-rose-400 h-16 resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* A - ABSTINENCE SECTION */}
                    <div className="p-5 bg-amber-50/15 border border-amber-100 rounded-3xl space-y-3">
                      <div className="flex items-center gap-2 border-b border-amber-200/50 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">A</span>
                        <h4 className="text-xs font-black text-[#1b254b] uppercase tracking-wider">Step 4: Abstinence & Asceticism (Reset Period Plan)</h4>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black uppercase text-slate-500 ml-1">Setup the barrier constraints. What reset length is targeted, and which strict blockades are active?</label>
                        <textarea 
                          value={reframerForm.abstinencePlan}
                          onChange={(e) => setReframerForm({ ...reframerForm, abstinencePlan: e.target.value })}
                          placeholder="e.g. 30 days complete reset. Self-binding rule: Leave phone in lockers outside bedroom at 9:30 PM."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 h-16 resize-none font-sans"
                        />
                      </div>
                    </div>

                    {/* M - MINDFULNESS SECTION */}
                    <div className="p-5 bg-purple-50/20 border border-purple-100 rounded-3xl space-y-3">
                      <div className="flex items-center gap-2 border-b border-purple-200/50 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center">M</span>
                        <h4 className="text-xs font-black text-[#1b254b] uppercase tracking-wider">Step 5: Mindfulness (How to Observe Urges without Reacting)</h4>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black uppercase text-slate-500 ml-1">Describe how {modalShortName} can sit quietly with high urge waves. What body experiences arise?</label>
                        <textarea 
                          value={reframerForm.mindfulnessNotes}
                          onChange={(e) => setReframerForm({ ...reframerForm, mindfulnessNotes: e.target.value })}
                          placeholder="e.g. Notice rapid heart rates, feel standard discomfort in chest, breathe slowly and count 1 to 10."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 h-16 resize-none font-sans"
                        />
                      </div>
                    </div>

                    {/* I - INSIGHT SECTION */}
                    <div className="p-5 bg-teal-50/20 border border-teal-100 rounded-3xl space-y-3">
                      <div className="flex items-center gap-2 border-b border-teal-200/50 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center">I</span>
                        <h4 className="text-xs font-black text-[#1b254b] uppercase tracking-wider">Step 6: Insight (Radical Honesty & Excuses Admitted)</h4>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black uppercase text-slate-500 ml-1">Write down the truth. What is the subtle lie or self-deception {modalShortName} typically tells?</label>
                        <textarea 
                          value={reframerForm.insightHonesty}
                          onChange={(e) => setReframerForm({ ...reframerForm, insightHonesty: e.target.value })}
                          placeholder="e.g. My mind tells me 'Just check this one tutorial for 1 minute' which triggers a chain of mindless scrolls."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 h-16 resize-none font-sans"
                        />
                      </div>
                    </div>

                    {/* N - NEXT STEPS SECTION */}
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-700 text-white font-black text-xs flex items-center justify-center">N</span>
                        <h4 className="text-xs font-black text-[#1b254b] uppercase tracking-wider">Step 7: Next Steps (Post-Reset Balance Blueprint)</h4>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black uppercase text-slate-500 ml-1">Will {modalShortName} moderate post-reset, or pursue complete termination? Define exact boundary rules.</label>
                        <textarea 
                          value={reframerForm.nextStepsPlan}
                          onChange={(e) => setReframerForm({ ...reframerForm, nextStepsPlan: e.target.value })}
                          placeholder="e.g. Limit usage to maximum 30 minutes on Saturday evening, only on an external television screen."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-[#1b254b] h-16 resize-none font-sans"
                        />
                      </div>
                    </div>

                    {/* E - EXPERIMENT SECTION */}
                    <div className="p-5 bg-emerald-50/20 border border-emerald-150 rounded-3xl space-y-3 border-l-4 border-l-emerald-500">
                      <div className="flex items-center gap-2 border-b border-emerald-150 pb-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">E</span>
                        <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">Step 8: Experiment (Hormetic Pain-First Active Testing)</h4>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black uppercase text-emerald-800 ml-1 font-black">
                          Define the pain-first/active discipline trial to trigger lasts-longer neurochemistry.
                        </label>
                        <textarea 
                          value={reframerForm.experimentRules}
                          onChange={(e) => setReframerForm({ ...reframerForm, experimentRules: e.target.value })}
                          placeholder="e.g. Push-ups or 1L cold waters on strike urge, do 30 mins active writing first before screens."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 h-16 resize-none font-sans"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex gap-4 mt-8 pt-4 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setIsAddingReframer(false)} 
                    className="flex-1 py-4 text-slate-400 hover:text-slate-800 font-black text-[10px] uppercase tracking-wider text-center"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleAddReframer}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-xl shadow-slate-900/10"
                  >
                    Save Loop Audit
                  </button>
                </div>

              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* POP-OVER MODAL FOR CUSTOM HABIT CREATION */}
      <AnimatePresence>
        {isAddingHabit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-xs flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[36px] p-8 md:p-10 w-full max-w-lg border border-slate-200 relative shadow-2xl"
            >
              <button 
                onClick={() => setIsAddingHabit(false)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase italic tracking-tighter">
                Add Metric Tracker
              </h3>

              <div className="space-y-5">
                
                {/* Metric Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                    Metric Name / Activity
                  </label>
                  <input 
                    value={habitForm.name}
                    onChange={(e) => setHabitForm({ ...habitForm, name: e.target.value })}
                    placeholder="e.g. YouTube, Book Reading, Social Scroll, Coding"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all font-sans"
                  />
                </div>

                {/* Metric Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                    Metaphor Category Type
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
                    <button 
                      onClick={() => setHabitForm({ ...habitForm, type: 'dopamine' })}
                      className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${habitForm.type === 'dopamine' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      Dopamine Cap
                    </button>
                    <button 
                      onClick={() => setHabitForm({ ...habitForm, type: 'effort' })}
                      className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${habitForm.type === 'effort' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      Effort Target
                    </button>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-bold block ml-3 italic">
                    {habitForm.type === 'dopamine' 
                      ? '🔴 Pleasure: Low effort instant gratification to limit.'
                      : '🟢 Pain/Effort: Hard active discipline to target.'
                    }
                  </span>
                </div>

                {/* Metric Sizing Inputs (Goal, Unit) */}
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Unit */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                      Measurement Unit
                    </label>
                    <select 
                      value={habitForm.unit}
                      onChange={(e) => setHabitForm({ ...habitForm, unit: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-xs font-black text-slate-950 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="Minutes">Minutes</option>
                      <option value="Hours">Hours</option>
                      <option value="Pages">Pages</option>
                      <option value="Liters">Liters</option>
                      <option value="Times">Times</option>
                      <option value="Cups">Cups</option>
                      <option value="Repetitions">Repetitions</option>
                    </select>
                  </div>

                  {/* Weekly Goal value */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                      Weekly Goal ({habitForm.type === 'dopamine' ? 'Max' : 'Min'})
                    </label>
                    <input 
                      type="number"
                      min="1"
                      value={habitForm.weeklyGoal}
                      onChange={(e) => setHabitForm({ ...habitForm, weeklyGoal: e.target.value })}
                      placeholder="e.g. 180"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                </div>

                {/* Color Schemes Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                    Visual Accent Color
                  </label>
                  <div className="flex gap-2 ml-3">
                    {DEFAULT_COLOR_THEMES.map((theme) => (
                      <button 
                        key={theme.id}
                        onClick={() => setHabitForm({ ...habitForm, color: theme.id })}
                        className={`w-7 h-7 rounded-full transition-transform hover:scale-125 border-2 ${
                          habitForm.color === theme.id ? 'border-indigo-600 scale-110 shadow-md' : 'border-white'
                        }`}
                        style={{ backgroundColor: `var(--color-${theme.id}-500, ${
                          theme.id === 'rose' ? '#f43f5e' : 
                          theme.id === 'sky' ? '#0ea5e9' : 
                          theme.id === 'emerald' ? '#10b981' : 
                          theme.id === 'amber' ? '#f59e0b' : 
                          theme.id === 'violet' ? '#8b5cf6' : '#6366f1'
                        })` }}
                        title={theme.id}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* Action buttons */}
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setIsAddingHabit(false)} 
                  className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-750 font-black text-[10px] uppercase tracking-wider text-center"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddAdvancedHabit}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/10"
                >
                  Create Metric
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
