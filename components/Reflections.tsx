import React from 'react';
import { AppData, ReflectionData, ReflectionEntry } from '../types';
import { motion } from 'motion/react';
import { Calendar, Target, Compass, Award, Flag } from 'lucide-react';
import { PAPER_STYLES } from '../src/styles/paperStyles';

interface ReflectionsProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
}

interface ReflectionCardProps {
  title: string;
  icon: any;
  value: string;
  onChange: (val: string) => void;
  colorClass: string;
  subtitle: string;
  paperClassName: string;
}

const ReflectionCard: React.FC<ReflectionCardProps> = ({ 
  title, 
  icon: Icon, 
  value, 
  onChange, 
  colorClass, 
  subtitle,
  paperClassName
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative overflow-hidden rounded-[36px] p-6 md:p-8 bg-white/[0.02] backdrop-blur-3xl border border-white/10 shadow-xl group transition-all hover:bg-white/[0.05]`}
  >
    <div className={`absolute top-0 right-0 w-48 h-48 -mr-24 -mt-24 rounded-full ${colorClass} opacity-10 blur-3xl group-hover:opacity-20 transition-all`}></div>
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-5">
        <div className={`p-4 rounded-[22px] ${colorClass} bg-opacity-90 text-white shadow-lg`}>
          <Icon size={26} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">{title}</h3>
          <p className="text-slate-900/50 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{subtitle}</p>
        </div>
      </div>
      <button 
        onClick={() => onChange('ARCHIVE')}
        className="p-2 bg-black/5 hover:bg-black/10 rounded-full text-slate-900/40 hover:text-slate-900 transition-all"
        title="Archive current entry and start fresh"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
      </button>
    </div>
    
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Type your goals and vision here...`}
      className={`w-full border border-white/20 rounded-[24px] p-6 text-slate-900 text-base font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[180px] resize-none transition-all placeholder:text-slate-900/20 custom-scrollbar leading-relaxed ${paperClassName}`}
    />
  </motion.div>
);

 export const Reflections: React.FC<ReflectionsProps> = ({ data, onUpdate }) => {
  const [showHistory, setShowHistory] = React.useState(false);
  const settings = data.settings || { fontSize: 12, fontFamily: "'Inter', sans-serif" };
  const paperStyle = settings.paperStyle || 'none';
  const selectedPaper = PAPER_STYLES.find(s => s.id === paperStyle) || PAPER_STYLES[0];
  
  const reflections = data.reflections || {
    weeklyReview: { id: 'weekly', title: 'Weekly Review', content: '' },
    monthlyChallenge: { id: 'monthly', title: 'Monthly Challenge', content: '' },
    threeMonthVision: { id: '3month', title: '3-Month Vision', content: '' },
    sixMonthVision: { id: '6month', title: '6-Month Vision', content: '' },
    oneYearVision: { id: '1year', title: '1-Year Vision', content: '' },
    archives: []
  };

  const handleUpdateReflection = (key: keyof ReflectionData, content: string) => {
    if (content === 'ARCHIVE') {
      const entryToArchive = reflections[key] as ReflectionEntry;
      if (!entryToArchive.content.trim()) return;

      const archivedEntry: ReflectionEntry = {
        ...entryToArchive,
        id: `${entryToArchive.id}-${Date.now()}`,
        archivedAt: new Date().toISOString()
      };

      const newReflections = {
        ...reflections,
        [key]: { ...entryToArchive, content: '' },
        archives: [...(reflections.archives || []), archivedEntry]
      };
      onUpdate({ ...data, reflections: newReflections });
      return;
    }

    const newReflections = {
      ...reflections,
      [key]: { ...(reflections[key] as ReflectionEntry), content }
    };
    onUpdate({ ...data, reflections: newReflections });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/[0.01] backdrop-blur-3xl p-4 md:p-8 overflow-y-auto custom-scrollbar font-sans text-slate-900">
      <div className="mb-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase italic drop-shadow-sm">
            Growth Mastery Plan
          </h1>
          <p className="text-orange-600 font-bold tracking-widest text-[10px] mt-2 uppercase opacity-80">
            Synthesize your journey from days to years
          </p>
        </div>
        
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="w-full md:w-auto px-6 py-3 bg-white/40 hover:bg-white/60 rounded-2xl text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all border border-white/40 shadow-sm"
        >
          {showHistory ? 'View Master Plan' : 'View Motivation Archives'}
        </button>
      </div>

      {!showHistory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pb-16">
          <ReflectionCard 
            title="Weekly Review" 
            subtitle="Wins & Adjustments"
            icon={Calendar}
            value={reflections.weeklyReview.content}
            onChange={(val) => handleUpdateReflection('weeklyReview', val)}
            colorClass="bg-orange-500"
            paperClassName={selectedPaper.className}
          />
          <ReflectionCard 
            title="Monthly Challenge" 
            subtitle="30-Day Mastery Status"
            icon={Target}
            value={reflections.monthlyChallenge.content}
            onChange={(val) => handleUpdateReflection('monthlyChallenge', val)}
            colorClass="bg-emerald-500"
            paperClassName={selectedPaper.className}
          />
          <ReflectionCard 
            title="3-Month Vision" 
            subtitle="Quarterly Evolution"
            icon={Compass}
            value={reflections.threeMonthVision.content}
            onChange={(val) => handleUpdateReflection('threeMonthVision', val)}
            colorClass="bg-indigo-500"
            paperClassName={selectedPaper.className}
          />
          <ReflectionCard 
            title="6-Month Vision" 
            subtitle="Bi-Annual Milestones"
            icon={Award}
            value={reflections.sixMonthVision.content}
            onChange={(val) => handleUpdateReflection('sixMonthVision', val)}
            colorClass="bg-purple-500"
            paperClassName={selectedPaper.className}
          />
          <ReflectionCard 
            title="1-Year Vision" 
            subtitle="Long-term Legacy"
            icon={Flag}
            value={reflections.oneYearVision.content}
            onChange={(val) => handleUpdateReflection('oneYearVision', val)}
            colorClass="bg-rose-500"
            paperClassName={selectedPaper.className}
          />
        </div>
      ) : (
        <div className="space-y-8 pb-16">
          {(reflections.archives || []).length === 0 && (
            <div className="py-32 text-center text-white/20 uppercase font-black italic tracking-widest border-2 border-dashed border-white/5 rounded-[40px]">
              No archived motivations yet.
            </div>
          )}
          {(reflections.archives || []).slice().reverse().map((archive) => (
            <motion.div 
              key={archive.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-black/60 border border-white/10 p-8 rounded-[40px] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 px-6 py-2 bg-white/5 text-white/30 text-[10px] font-black uppercase tracking-widest rounded-bl-[20px]">
                {new Date(archive.archivedAt!).toLocaleDateString()}
              </div>
              <h3 className="text-xl font-black text-orange-400 uppercase italic mb-4">{archive.title}</h3>
              <div className="text-white/60 text-lg leading-relaxed whitespace-pre-wrap italic">
                "{archive.content}"
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};
