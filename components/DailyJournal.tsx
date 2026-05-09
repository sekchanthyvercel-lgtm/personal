import React, { useState, useEffect } from 'react';
import { AppData, JournalEntry, ReflectionData } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addDays, subMonths, addMonths } from 'date-fns';
import { CheckCircle2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, BookOpen, Clock, X, Target, Quote, Heart, Sparkles, Footprints, Zap, ShieldCheck, Lightbulb, Activity, Circle, CheckSquare, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PAPER_STYLES } from '../src/styles/paperStyles';
import { RichTextDiv } from './FloatingToolbar';

interface DailyJournalProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
  onUpdateJournalEntry?: (date: string, entry: JournalEntry) => void;
}

interface JournalBlockProps {
  title: string | React.ReactNode;
  icon: React.ReactNode;
  children: React.ReactNode;
  bgColor?: string;
}

const JournalBlock: React.FC<JournalBlockProps> = ({ title, icon, children, bgColor = "bg-white/[0.03]" }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${bgColor} rounded-[28px] p-6 shadow-sm border border-white/10 relative overflow-hidden`}>
    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/40"></div>
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <h3 className="text-sm font-black text-black leading-tight italic uppercase tracking-wider">{title}</h3>
    </div>
    <div className="pl-8 text-black/70 font-bold">{children}</div>
  </motion.div>
);

 export const DailyJournal: React.FC<DailyJournalProps> = ({ data, onUpdate, onUpdateJournalEntry }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reflectionMode, setReflectionMode] = useState<'Daily' | 'Weekly' | 'Monthly' | '3Month' | 'Calendar'>('Daily');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  
  // Local state for auto-syncing inputs to prevent cursor jumping
  const [localEntry, setLocalEntry] = useState<JournalEntry | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);

  const journalSettings = data.settings || { fontSize: 12, fontFamily: "'Inter', sans-serif" };
  const textFontFamily = journalSettings.textFontFamily || journalSettings.fontFamily;
  const textFontSize = journalSettings.textFontSize || 16;
  const paperStyle = journalSettings.paperStyle || 'none';
  const selectedPaper = PAPER_STYLES.find(s => s.id === paperStyle) || PAPER_STYLES[0];
  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  const entries = data.journalEntries || {};
  const currentEntry = entries[dateKey] || {
    achievements: ['', ''],
    affirmation: '',
    gratitude: '',
    feeling: '',
    appreciation: '',
    lookingForward: '',
    inspiration: '',
    learning: '',
    discipline: '',
    isCompleted: false
  };

  // Sync prop data to local state when not focused
  useEffect(() => {
    if (!activeField) {
      setLocalEntry({ ...currentEntry });
    }
  }, [currentEntry, activeField]);

  const updateEntry = (key: keyof JournalEntry, value: any) => {
    // Update local state immediately
    if (localEntry) {
      setLocalEntry({ ...localEntry, [key]: value });
    }

    const newEntries = { ...entries };
    const entry = { ...(localEntry || currentEntry), [key]: value };
    newEntries[dateKey] = entry;
    if (onUpdateJournalEntry) {
      onUpdateJournalEntry(dateKey, entry);
    } else {
      onUpdate({ ...data, journalEntries: newEntries });
    }
  };

  const updateAchievement = (idx: number, val: string) => {
    const newAchs = [...(localEntry || currentEntry).achievements];
    newAchs[idx] = val;
    updateEntry('achievements', newAchs);
  };

  const updateReflection = (type: keyof ReflectionData, val: string) => {
    const reflections = data.reflections || {
      weeklyReview: { id: 'weekly', title: 'Weekly Review', content: '' },
      monthlyChallenge: { id: 'monthly', title: 'Monthly Challenge', content: '' },
      threeMonthVision: { id: '3month', title: '3-Month Vision', content: '' },
      sixMonthVision: { id: '6month', title: '6-Month Vision', content: '' },
      oneYearVision: { id: '1year', title: '1-Year Vision', content: '' }
    };
    
    const newReflections = {
      ...reflections,
      [type]: { ...reflections[type], content: val }
    };
    
    onUpdate({ ...data, reflections: newReflections });
  };

  const RatingScale = ({ label, value, onChange, icon, color = "emerald" }: { label: string, value?: number, onChange: (val: number) => void, icon: React.ReactNode, color?: string }) => (
    <div className="flex flex-col gap-3 py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        </div>
        <span className={`text-lg font-black text-${color}-600`}>{value || 0}/10</span>
      </div>
      <div className="flex gap-1">
        {[1,2,3,4,5,6,7,8,9,10].map(num => (
          <button 
            key={num}
            onClick={() => onChange(num)}
            className={`flex-1 h-8 rounded-lg transition-all border ${value === num ? `bg-${color}-500 border-${color}-600 shadow-lg shadow-${color}-500/20` : 'bg-white border-slate-200 hover:bg-slate-50'}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-white/[0.01] backdrop-blur-3xl p-3 md:p-8 overflow-y-auto md:overflow-hidden font-sans text-slate-900">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 px-4 md:px-8 pt-8">
        <div>
          <div className="flex items-center gap-2">
              <BookOpen className="text-emerald-600 shrink-0" size={20} />
              <h1 className="text-lg md:text-xl lg:text-2xl font-black text-slate-800 tracking-tighter uppercase leading-tight whitespace-nowrap truncate">
                DAILY SELF-REFLECTIONS
              </h1>
          </div>
          <p className="text-emerald-600 font-bold mt-2 tracking-tight italic opacity-90 text-sm ml-8">Cultivating mindfulness and discipline.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCalendar(true)}
            className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center"
            title="Open Monthly Journal View"
          >
            <CalendarIcon size={20} />
          </button>

          <div className="flex items-center justify-between bg-emerald-500/20 backdrop-blur-3xl px-4 py-3 rounded-full border border-white/40 shadow-sm min-w-[280px]">
            <button onClick={() => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() - 1)))} className="p-1 hover:bg-white/40 rounded-full transition-all text-slate-900">
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col items-center px-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 leading-tight">{format(selectedDate, 'EEEE')}</span>
              <span className="text-base font-black text-slate-900 leading-tight">{format(selectedDate, 'MMM d, yyyy')}</span>
            </div>
            <button onClick={() => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() + 1)))} className="p-1 hover:bg-white/40 rounded-full transition-all text-slate-900">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar-green px-4 md:px-8 pb-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex gap-3 mb-8 overflow-x-auto no-scrollbar pb-2">
              {[
                  { id: 'Daily', label: 'Self-Reflection' },
                  { id: 'Weekly', label: 'Weekly Growth' },
                  { id: 'Monthly', label: 'Monthly Master' },
                  { id: '3Month', label: '90-Day Vision' },
                  { id: 'Calendar', label: 'Journal History' }
              ].map((m) => (
                  <button 
                  key={m.id}
                  onClick={() => setReflectionMode(m.id as any)}
                  className={`px-8 py-3.5 rounded-full font-black text-[12px] uppercase tracking-widest transition-all whitespace-nowrap ${reflectionMode === m.id ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30' : 'bg-white/20 text-emerald-100 hover:bg-white/30 backdrop-blur-md'}`}
                  >
                      {m.label}
                  </button>
              ))}
          </div>

          <AnimatePresence mode="wait">
            {reflectionMode === 'Daily' ? (
              <motion.div key="daily" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <JournalBlock title={<span className="flex items-center justify-between gap-2">What are my Today's priorities? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; updateEntry('achievements', [...(localEntry || currentEntry).achievements.slice(0, -1), ((localEntry || currentEntry).achievements.at(-1) || '') + html]); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<CheckCircle2 className="text-emerald-600" size={20} />} bgColor={selectedPaper.className}>
                  <div className="space-y-4">
                    {(localEntry || currentEntry).achievements.map((ach, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                         <div className="w-6 h-6 border-2 border-emerald-400/30 rounded flex items-center justify-center bg-white/20">
                              {ach.trim() !== '' && <CheckCircle2 size={14} className="text-emerald-600" />}
                         </div>
                         <RichTextDiv 
                           value={ach} 
                           onFocus={() => setActiveField(`ach-${idx}`)}
                           onBlur={() => setActiveField(null)}
                           onChange={(val) => updateAchievement(idx, val)} 
                           placeholder="Type an objective..." 
                           className="flex-1 bg-transparent border-b border-black/10 py-2 outline-none focus:border-emerald-600 transition-all font-bold text-slate-900 placeholder:text-slate-900/20" 
                           style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                         />
                      </div>
                    ))}
                    <button onClick={() => updateEntry('achievements', [...(localEntry || currentEntry).achievements, ''])} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors">+ Add Another</button>
                  </div>
                </JournalBlock>

                <JournalBlock title={<span className="flex items-center gap-2">Today's Positive Affirmation - What truth sets the tone for your day? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = (localEntry || currentEntry).affirmation || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateEntry('affirmation', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Quote className="text-cyan-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv 
                    value={(localEntry || currentEntry).affirmation} 
                    onFocus={() => setActiveField('affirmation')}
                    onBlur={() => setActiveField(null)}
                    onChange={(val) => updateEntry('affirmation', val)} 
                    placeholder="I am capable..." 
                    className="w-full bg-transparent outline-none italic font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-16" 
                    style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                  />
                </JournalBlock>

                <JournalBlock title={<span className="flex items-center gap-2">What am I grateful for today? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = (localEntry || currentEntry).gratitude || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateEntry('gratitude', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Heart className="text-rose-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv 
                    value={(localEntry || currentEntry).gratitude} 
                    onFocus={() => setActiveField('gratitude')}
                    onBlur={() => setActiveField(null)}
                    onChange={(val) => updateEntry('gratitude', val)} 
                    placeholder="I am grateful for..." 
                    className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-16" 
                    style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                  />
                </JournalBlock>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <JournalBlock title={<span className="flex items-center gap-2">How do I choose to feel today? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = (localEntry || currentEntry).feeling || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateEntry('feeling', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Sparkles className="text-amber-600" size={20} />} bgColor={selectedPaper.className}>
                      <RichTextDiv 
                        value={(localEntry || currentEntry).feeling} 
                        onFocus={() => setActiveField('feeling')}
                        onBlur={() => setActiveField(null)}
                        onChange={(val) => updateEntry('feeling', val)} 
                        placeholder="Peaceful, productive..." 
                        className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20" 
                        style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                      />
                  </JournalBlock>

                  <JournalBlock title={<span className="flex items-center gap-2">Who am I surprising with appreciation today? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = (localEntry || currentEntry).appreciation || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateEntry('appreciation', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Footprints className="text-indigo-600" size={20} />} bgColor={selectedPaper.className}>
                      <RichTextDiv 
                        value={(localEntry || currentEntry).appreciation} 
                        onFocus={() => setActiveField('appreciation')}
                        onBlur={() => setActiveField(null)}
                        onChange={(val) => updateEntry('appreciation', val)} 
                        placeholder="A quick note to..." 
                        className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20" 
                        style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                      />
                  </JournalBlock>
                </div>

                <JournalBlock title="Performance Metrics (1-10)" icon={<Zap className="text-orange-600" size={20} />} bgColor={selectedPaper.className}>
                  <div className="space-y-2">
                      <RatingScale 
                        label="Energy Level (Physical/Mental)" 
                        value={(localEntry || currentEntry).energyRating} 
                        onChange={(val) => updateEntry('energyRating', val)} 
                        icon={<Zap size={14} className="text-orange-500" />}
                        color="orange"
                      />
                      <RatingScale 
                        label="Focus & Concentration" 
                        value={(localEntry || currentEntry).focusRating} 
                        onChange={(val) => updateEntry('focusRating', val)} 
                        icon={<Target size={14} className="text-indigo-500" />}
                        color="indigo"
                      />
                      <RatingScale 
                        label="Productivity & Execution" 
                        value={(localEntry || currentEntry).productivityRating} 
                        onChange={(val) => updateEntry('productivityRating', val)} 
                        icon={<Activity size={14} className="text-emerald-500" />}
                        color="emerald"
                      />
                      <RatingScale 
                        label="Stress & Anxiety Management" 
                        value={(localEntry || currentEntry).stressRating} 
                        onChange={(val) => updateEntry('stressRating', val)} 
                        icon={<ShieldCheck size={14} className="text-rose-500" />}
                        color="rose"
                      />
                      <RatingScale 
                        label="Gratitude Depth" 
                        value={(localEntry || currentEntry).gratitudeRating} 
                        onChange={(val) => updateEntry('gratitudeRating', val)} 
                        icon={<Heart size={14} className="text-pink-500" />}
                        color="pink"
                      />
                      <RatingScale 
                        label="Physical Vitality" 
                        value={(localEntry || currentEntry).vitalityRating} 
                        onChange={(val) => updateEntry('vitalityRating', val)} 
                        icon={<Sparkles size={14} className="text-amber-500" />}
                        color="amber"
                      />
                  </div>
                </JournalBlock>

                <JournalBlock title={<span className="flex items-center gap-2">What are the great things that happened today? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = (localEntry || currentEntry).inspiration || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateEntry('inspiration', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Quote className="text-emerald-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv 
                    value={(localEntry || currentEntry).inspiration} 
                    onFocus={() => setActiveField('inspiration')}
                    onBlur={() => setActiveField(null)}
                    onChange={(val) => updateEntry('inspiration', val)} 
                    placeholder="Moments of joy..."
                    className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-24" 
                    style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                  />
                </JournalBlock>

                <JournalBlock title={<span className="flex items-center gap-2">What is one thing I learned today? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = (localEntry || currentEntry).learning || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateEntry('learning', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Lightbulb className="text-emerald-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv 
                    value={(localEntry || currentEntry).learning} 
                    onFocus={() => setActiveField('learning')}
                    onBlur={() => setActiveField(null)}
                    onChange={(val) => updateEntry('learning', val)} 
                    placeholder="New insights..."
                    className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-24" 
                    style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                  />
                </JournalBlock>
              </motion.div>
            ) : reflectionMode === 'Weekly' ? (
              <motion.div key="weekly" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <JournalBlock title={<span className="flex items-center gap-2">Weekly Review - Did I work on my goals? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = data.reflections?.weeklyReview?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('weeklyReview', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Target className="text-emerald-600" size={20} />} bgColor={selectedPaper.className}>
                    <RichTextDiv value={data.reflections?.weeklyReview?.content || ''} onChange={(val) => updateReflection('weeklyReview', val)} placeholder="Review your goals and progress this week..." className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                  </JournalBlock>
                  <JournalBlock title={<span className="flex items-center gap-2">What needs adjustment for next week? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = data.reflections?.sixMonthVision?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('sixMonthVision', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Zap className="text-orange-600" size={20} />} bgColor={selectedPaper.className}>
                    <RichTextDiv value={data.reflections?.sixMonthVision?.content || ''} onChange={(val) => updateReflection('sixMonthVision', val)} placeholder="Identify changes to stay on track..." className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                  </JournalBlock>
                  <JournalBlock title={<span className="flex items-center gap-2">Key Successes & Learnings this week <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = data.reflections?.oneYearVision?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('oneYearVision', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Lightbulb className="text-emerald-600" size={20} />} bgColor={selectedPaper.className}>
                    <RichTextDiv value={data.reflections?.oneYearVision?.content || ''} onChange={(val) => updateReflection('oneYearVision', val)} placeholder="What was your biggest win?" className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                  </JournalBlock>
              </motion.div>
            ) : reflectionMode === 'Monthly' ? (
              <motion.div key="monthly" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <JournalBlock title={<span className="flex items-center gap-2">Monthly Master - Key Achievements <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = data.reflections?.monthlyChallenge?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('monthlyChallenge', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<ShieldCheck className="text-emerald-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv value={data.reflections?.monthlyChallenge?.content || ''} onChange={(val) => updateReflection('monthlyChallenge', val)} placeholder="Reflect on your biggest wins this month..." className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                </JournalBlock>
                <JournalBlock title={<span className="flex items-center gap-2">Core Growth Area & Major Learnings <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = data.reflections?.threeMonthVision?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('threeMonthVision', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Lightbulb className="text-amber-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv value={data.reflections?.threeMonthVision?.content || ''} onChange={(val) => updateReflection('threeMonthVision', val)} placeholder="What was the most significant area of maturity this month?" className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                </JournalBlock>
              </motion.div>
            ) : reflectionMode === '3Month' ? (
              <motion.div key="3month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <JournalBlock title={<span className="flex items-center gap-2">90-Day Vision Evolution <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = data.reflections?.threeMonthVision?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('threeMonthVision', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Sparkles className="text-purple-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv value={data.reflections?.threeMonthVision?.content || ''} onChange={(val) => updateReflection('threeMonthVision', val)} placeholder="How has your 3-month vision shifted since the start?" className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                </JournalBlock>
                <JournalBlock title={<span className="flex items-center gap-2">The Next Plateau for Peak Performance <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = data.reflections?.sixMonthVision?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('sixMonthVision', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Target className="text-rose-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv value={data.reflections?.sixMonthVision?.content || ''} onChange={(val) => updateReflection('sixMonthVision', val)} placeholder="What is the next major milestone for the upcoming quarter?" className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                </JournalBlock>
              </motion.div>
            ) : (
              <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="bg-white/40 backdrop-blur-3xl rounded-[40px] shadow-sm border border-white/20 overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-white/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-600 text-white rounded-2xl">
                        <CalendarIcon size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black uppercase italic tracking-tighter text-slate-800">Monthly Journal Planner</h2>
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/60">Review your daily priorities & progression</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-emerald-500/10 p-1 rounded-xl border border-emerald-500/10">
                      <button 
                        onClick={() => setCalendarViewDate(prev => subMonths(prev, 1))}
                        className="p-2 hover:bg-white/50 rounded-lg transition-all text-emerald-700"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="px-4 text-center min-w-[120px]">
                         <span className="block text-sm font-black text-slate-800">{format(calendarViewDate, 'MMMM yyyy')}</span>
                      </div>
                      <button 
                        onClick={() => setCalendarViewDate(prev => addMonths(prev, 1))}
                        className="p-2 hover:bg-white/50 rounded-lg transition-all text-emerald-700"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50/10">
                    <div className="grid grid-cols-7 gap-px bg-slate-200/50 border border-slate-200/50 rounded-2xl overflow-hidden">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="bg-white/90 py-3 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {day}
                        </div>
                      ))}
                      
                      {Array.from({ length: getDay(startOfMonth(calendarViewDate)) }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-slate-50/20 h-24 md:h-32" />
                      ))}

                      {eachDayOfInterval({
                        start: startOfMonth(calendarViewDate),
                        end: endOfMonth(calendarViewDate)
                      }).map((day, i) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const dayEntry = data.journalEntries?.[dayKey];
                        const isToday = isSameDay(day, new Date());
                        const isSelected = isSameDay(day, selectedDate);

                        return (
                          <div 
                            key={i} 
                            onClick={() => {
                              setSelectedDate(day);
                              setReflectionMode('Daily');
                            }}
                            className={`bg-white h-24 md:h-32 p-3 flex flex-col gap-1 cursor-pointer transition-all hover:bg-emerald-50 relative group ${isSelected ? 'ring-2 ring-inset ring-emerald-500 z-10' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[11px] font-black ${isToday ? 'w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center' : isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {format(day, 'd')}
                              </span>
                              {dayEntry?.isCompleted && (
                                <CheckCircle2 size={12} className="text-emerald-500" />
                              )}
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5 mt-0.5">
                              {dayEntry?.achievements?.filter(a => a.trim() !== '').slice(0, 3).map((ach, idx) => (
                                <div key={idx} className="flex items-center gap-1 bg-slate-50/50 p-1 rounded-md border border-slate-100">
                                  <div className="shrink-0 w-1 h-1 rounded-full bg-emerald-400" />
                                  <span className="text-[8px] font-bold text-slate-600 truncate leading-none">{ach.replace(/<[^>]*>?/gm, '')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center pt-8">
             <button onClick={() => updateEntry('isCompleted', !currentEntry.isCompleted)} className={`flex items-center gap-3 px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl ${currentEntry.isCompleted ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-white/90 text-emerald-600 border-2 border-emerald-500/30 shadow-xl backdrop-blur-xl hover:bg-white'}`}>
                {currentEntry.isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />} {currentEntry.isCompleted ? 'Reflection Complete' : 'Mark as Complete'}
             </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCalendar && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50 text-emerald-900">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg">
                    <CalendarIcon size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-tight">Monthly Journal Planner</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Review your daily priorities & progression</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 bg-white/50 p-1 rounded-xl border border-white">
                    <button 
                      onClick={() => setCalendarViewDate(prev => subMonths(prev, 1))}
                      className="p-2 hover:bg-white rounded-lg transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="px-4 text-center min-w-[140px]">
                       <span className="block text-[8px] font-black uppercase text-emerald-600 leading-none mb-1 tracking-widest">{format(calendarViewDate, 'yyyy')}</span>
                       <span className="block text-base font-black text-slate-800 leading-none">{format(calendarViewDate, 'MMMM')}</span>
                    </div>
                    <button 
                      onClick={() => setCalendarViewDate(prev => addMonths(prev, 1))}
                      className="p-2 hover:bg-white rounded-lg transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowCalendar(false)}
                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all rounded-full"
                  >
                    <X size={28} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden shadow-inner">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-white py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {day}
                    </div>
                  ))}
                  
                  {Array.from({ length: getDay(startOfMonth(calendarViewDate)) }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-slate-50/30 h-32 md:h-40" />
                  ))}

                  {eachDayOfInterval({
                    start: startOfMonth(calendarViewDate),
                    end: endOfMonth(calendarViewDate)
                  }).map((day, i) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayEntry = data.journalEntries?.[dayKey];
                    const isToday = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);

                    return (
                      <div 
                        key={i} 
                        onClick={() => {
                          setSelectedDate(day);
                          setShowCalendar(false);
                        }}
                        className={`bg-white h-32 md:h-40 p-3 flex flex-col gap-2 cursor-pointer transition-all hover:bg-emerald-50/50 relative group ${isSelected ? 'ring-2 ring-inset ring-emerald-500 z-10 shadow-lg' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-black ${isToday ? 'w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center' : isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {format(day, 'd')}
                          </span>
                          {dayEntry?.isCompleted && (
                            <CheckCircle2 size={14} className="text-emerald-500 shadow-sm" />
                          )}
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 mt-1">
                          {dayEntry?.achievements?.filter(a => a.trim() !== '').map((ach, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 group/ach bg-slate-50 p-1.5 rounded-lg border border-slate-100 hover:border-emerald-200 transition-colors">
                              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover/ach:scale-125 transition-transform" />
                              <span className="text-[9px] font-bold text-slate-700 leading-tight line-clamp-2">{ach}</span>
                            </div>
                          ))}
                          {(!dayEntry?.achievements || dayEntry.achievements.every(a => a.trim() === '')) && (
                            <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <span className="text-[8px] font-black uppercase text-slate-300 tracking-tighter">No Priorities</span>
                            </div>
                          )}
                        </div>

                        {isSelected && (
                           <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                    <span className="text-[10px] font-black uppercase text-slate-500">Today</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500"></div>
                    <span className="text-[10px] font-black uppercase text-slate-500">Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase text-slate-500">Completed Reflection</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowCalendar(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar-green::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar-green::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar-green::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar-green::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.5);
        }
      `}</style>
    </div>
  );
};
