import React, { useState } from 'react';
import { AppData, JournalEntry } from '../types';
import { format } from 'date-fns';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Calendar, BookOpen, Quote, Heart, Sparkles, Footprints, Lightbulb, ShieldCheck, Zap, Target, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DailyJournalProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
}

interface JournalBlockProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  bgColor?: string;
}

const JournalBlock: React.FC<JournalBlockProps> = ({ title, icon, children, bgColor = "bg-white/[0.03]" }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${bgColor} rounded-[28px] p-6 shadow-sm border border-white/10 backdrop-blur-3xl relative overflow-hidden`}>
    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/40"></div>
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <h3 className="text-sm font-black text-black leading-tight italic uppercase tracking-wider">{title}</h3>
    </div>
    <div className="pl-8 text-black/70 font-bold">{children}</div>
  </motion.div>
);

export const DailyJournal: React.FC<DailyJournalProps> = ({ data, onUpdate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Adding state for different reflection modes
  const [reflectionMode, setReflectionMode] = useState<'Daily' | 'Weekly' | 'Monthly' | '3Month'>('Daily');

  const journalSettings = data.settings || { fontSize: 12, fontFamily: "'Inter', sans-serif" };
  const textFontFamily = journalSettings.textFontFamily || journalSettings.fontFamily;
  const textFontSize = journalSettings.textFontSize || 16;
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

  const updateEntry = (key: keyof JournalEntry, value: any) => {
    const newEntries = { ...entries };
    newEntries[dateKey] = { ...currentEntry, [key]: value };
    onUpdate({ ...data, journalEntries: newEntries });
  };

  const updateAchievement = (idx: number, val: string) => {
    const newAchievements = [...currentEntry.achievements];
    newAchievements[idx] = val;
    updateEntry('achievements', newAchievements);
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

      <div className="flex-1 overflow-y-auto custom-scrollbar-green px-4 md:px-8 pb-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex gap-3 mb-8 overflow-x-auto no-scrollbar pb-2">
              {['Daily', 'Weekly', 'Monthly', '3Month'].map((m) => (
                  <button 
                  key={m}
                  onClick={() => setReflectionMode(m as any)}
                  className={`px-8 py-3.5 rounded-full font-black text-[12px] uppercase tracking-widest transition-all whitespace-nowrap ${reflectionMode === m ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30' : 'bg-white/20 text-emerald-100 hover:bg-white/30 backdrop-blur-md'}`}
                  >
                      {m} Review
                  </button>
              ))}
          </div>

          <JournalBlock title="Top things you choose to achieve today?" icon={<CheckCircle2 className="text-emerald-600" size={20} />} bgColor="bg-white/10 border-white/20">
            <div className="space-y-4">
              {currentEntry.achievements.map((ach, idx) => (
                <div key={idx} className="flex items-center gap-4">
                   <div className="w-6 h-6 border-2 border-emerald-400/30 rounded flex items-center justify-center bg-white/20">
                        {ach.trim() !== '' && <CheckCircle2 size={14} className="text-emerald-600" />}
                   </div>
                   <input 
                     type="text" 
                     value={ach} 
                     onChange={(e) => updateAchievement(idx, e.target.value)} 
                     placeholder="Type an objective..." 
                     className="flex-1 bg-transparent border-b border-black/10 py-2 outline-none focus:border-emerald-600 transition-all font-bold text-slate-900 placeholder:text-slate-900/20" 
                     style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                   />
                </div>
              ))}
              <button onClick={() => updateEntry('achievements', [...currentEntry.achievements, ''])} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors">+ Add Another</button>
            </div>
          </JournalBlock>

          <JournalBlock title="Today's affirmation" icon={<Quote className="text-cyan-600" size={20} />} bgColor="bg-white/10 border-white/20">
            <textarea 
              value={currentEntry.affirmation} 
              onChange={(e) => updateEntry('affirmation', e.target.value)} 
              placeholder="I am capable..." 
              className="w-full bg-transparent outline-none italic font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-16" 
              style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
            />
          </JournalBlock>

          <JournalBlock title="Today's Gratitude" icon={<Heart className="text-rose-600" size={20} />} bgColor="bg-white/10 border-white/20">
            <textarea 
              value={currentEntry.gratitude} 
              onChange={(e) => updateEntry('gratitude', e.target.value)} 
              placeholder="I am grateful for..." 
              className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-16" 
              style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
            />
          </JournalBlock>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            < JournalBlock title="How do I choose to feel today?" icon={<Sparkles className="text-amber-600" size={20} />} bgColor="bg-white/10 border-white/20">
                <input 
                  type="text" 
                  value={currentEntry.feeling} 
                  onChange={(e) => updateEntry('feeling', e.target.value)} 
                  placeholder="Peaceful, productive..." 
                  className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20" 
                  style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                />
            </JournalBlock>

            < JournalBlock title="Surprise someone with appreciation" icon={<Footprints className="text-indigo-600" size={20} />} bgColor="bg-white/10 border-white/20">
                <input 
                  type="text" 
                  value={currentEntry.appreciation} 
                  onChange={(e) => updateEntry('appreciation', e.target.value)} 
                  placeholder="A quick note to..." 
                  className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20" 
                  style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                />
            </JournalBlock>
          </div>

          <JournalBlock title="Performance Metrics (1-10)" icon={<Zap className="text-orange-600" size={20} />} bgColor="bg-white/10 border-white/20">
             <div className="space-y-2">
                <RatingScale 
                  label="Energy Level (Physical/Mental)" 
                  value={currentEntry.energyRating} 
                  onChange={(val) => updateEntry('energyRating', val)} 
                  icon={<Zap size={14} className="text-orange-500" />}
                  color="orange"
                />
                <RatingScale 
                  label="Focus & Concentration" 
                  value={currentEntry.focusRating} 
                  onChange={(val) => updateEntry('focusRating', val)} 
                  icon={<Target size={14} className="text-indigo-500" />}
                  color="indigo"
                />
                <RatingScale 
                  label="Productivity & Execution" 
                  value={currentEntry.productivityRating} 
                  onChange={(val) => updateEntry('productivityRating', val)} 
                  icon={<Activity size={14} className="text-emerald-500" />}
                  color="emerald"
                />
                <RatingScale 
                  label="Stress & Anxiety Management" 
                  value={currentEntry.stressRating} 
                  onChange={(val) => updateEntry('stressRating', val)} 
                  icon={<ShieldCheck size={14} className="text-rose-500" />}
                  color="rose"
                />
                <RatingScale 
                  label="Gratitude Depth" 
                  value={currentEntry.gratitudeRating} 
                  onChange={(val) => updateEntry('gratitudeRating', val)} 
                  icon={<Heart size={14} className="text-pink-500" />}
                  color="pink"
                />
                <RatingScale 
                  label="Physical Vitality" 
                  value={currentEntry.vitalityRating} 
                  onChange={(val) => updateEntry('vitalityRating', val)} 
                  icon={<Sparkles size={14} className="text-amber-500" />}
                  color="amber"
                />
             </div>
          </JournalBlock>

          <div className="flex items-center gap-4 py-8">
            <div className="h-[1px] flex-1 bg-black/10"></div>
            <div className="flex items-center gap-2 text-emerald-600">
                <Lightbulb size={24} />
                <span className="font-black uppercase tracking-widest text-xs">Final Thoughts</span>
            </div>
            <div className="h-[1px] flex-1 bg-black/10"></div>
          </div>

          <JournalBlock title="Reflection & GREAT things that happened?" icon={<Quote className="text-emerald-600" size={20} />} bgColor="bg-white/10 border-white/20">
            <textarea 
              value={currentEntry.inspiration} 
              onChange={(e) => updateEntry('inspiration', e.target.value)} 
              className="w-full bg-transparent outline-none font-bold text-slate-900 resize-none h-24" 
              style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
            />
          </JournalBlock>

          <JournalBlock title="ONE thing learned today?" icon={<Lightbulb className="text-emerald-600" size={20} />} bgColor="bg-white/10 border-white/20">
            <textarea 
              value={currentEntry.learning} 
              onChange={(e) => updateEntry('learning', e.target.value)} 
              className="w-full bg-transparent outline-none font-bold text-slate-900 resize-none h-24" 
              style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
            />
          </JournalBlock>

          <div className="flex justify-center pt-8">
             <button onClick={() => updateEntry('isCompleted', !currentEntry.isCompleted)} className={`flex items-center gap-3 px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl ${currentEntry.isCompleted ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-white/90 text-emerald-600 border-2 border-emerald-500/30 shadow-xl backdrop-blur-xl hover:bg-white'}`}>
                {currentEntry.isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />} {currentEntry.isCompleted ? 'Reflection Complete' : 'Mark as Complete'}
             </button>
          </div>
        </div>
      </div>

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
