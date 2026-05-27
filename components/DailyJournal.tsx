import React, { useState, useEffect, useRef } from 'react';
import { AppData, JournalEntry, ReflectionData } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addDays, subDays, subMonths, addMonths, startOfWeek, endOfWeek } from 'date-fns';
import { CheckCircle2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, BookOpen, Clock, X, Target, Quote, Heart, Sparkles, Footprints, Zap, ShieldCheck, Lightbulb, Activity, Circle, CheckSquare, Palette, RefreshCw, FileText, FileDown, ChevronDown, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PAPER_STYLES } from '../src/styles/paperStyles';
import { RichTextDiv } from './FloatingToolbar';
// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import html2canvas from 'html2canvas';

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
  const [promptText, setPromptText] = useState<string>('');
  const [promptLoading, setPromptLoading] = useState<boolean>(false);

  // AI Journal Insight States
  const [weeklyInsightLoading, setWeeklyInsightLoading] = useState<boolean>(false);
  const [weeklyInsightError, setWeeklyInsightError] = useState<string | null>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const journalRef = useRef<HTMLDivElement>(null);

  const exportPDF = async () => {
    if (!journalRef.current) return;
    
    // Create a robust container for export
    const exportContainer = document.createElement('div');
    exportContainer.style.width = '800px'; 
    exportContainer.style.padding = '50px';
    exportContainer.style.backgroundColor = 'white';
    exportContainer.style.color = '#000';
    exportContainer.style.fontFamily = "'Inter', sans-serif";
    exportContainer.style.position = 'absolute';
    exportContainer.style.left = '-9999px';
    document.body.appendChild(exportContainer);
    
    const title = reflectionMode === 'Daily' ? `Daily Reflection - ${format(selectedDate, 'MMM d, yyyy')}` : `${reflectionMode} Performance Report`;
    
    exportContainer.innerHTML = `
      <div style="margin-bottom: 30px; border-bottom: 5px solid #10b981; padding-bottom: 25px;">
        <h1 style="font-size: 28pt; font-weight: 955; color: #064e3b; margin: 0; letter-spacing: -1.5px;">${title}</h1>
        <p style="font-size: 11pt; color: #64748b; margin-top: 10px; text-transform: uppercase; letter-spacing: 4px; font-weight: 800;">Self-Reflection Masterpost • ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="journal-content" style="line-height: 1.8; font-size: 12pt;">
        ${journalRef.current.innerHTML}
      </div>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Caveat:wght@400;700&display=swap');
        .journal-content h3 { font-size: 16pt; font-weight: 900; margin-top: 25pt; color: #065f46; border-bottom: 2px solid #a7f3d0; padding-bottom: 8px; margin-bottom: 12pt; }
        .journal-content p { margin-bottom: 14pt; color: #1e293b; }
        .journal-content { font-family: 'Inter', sans-serif; }
        .journal-content[style*="font-family: cursive"], .journal-content [style*="font-family: cursive"] { font-family: 'Dancing Script', cursive !important; }
        .paper-ruled { background-image: linear-gradient(#f1f5f9 2px, transparent 2px) !important; background-size: 100% 2.25rem !important; background-color: #ffffff !important; }
        .paper-grid { background-image: linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px) !important; background-size: 1.5rem 1.5rem !important; background-color: #ffffff !important; }
        .paper-dots { background-image: radial-gradient(#e2e8f0 2px, transparent 2px) !important; background-size: 1.5rem 1.5rem !important; background-color: #ffffff !important; }
        .rounded-[28px] { border: 2px solid #ecfdf5 !important; border-radius: 20px !important; padding: 25px !important; margin-bottom: 20px !important; background: #ffffff !important; }
        .bg-white\\/\\[0\\.03\\] { background: #ffffff !important; border: 1px solid #f1f5f9; }
        .flex { display: block !important; }
        .rating-num { font-weight: 900; }
        button, .no-print, input[type="checkbox"], .task-checkbox { display: none !important; }
        .text-black\\/70 { color: #1e293b !important; }
        img { border-radius: 12px; margin: 15px 0; }
        .grid { display: block !important; }
        .md\\:grid-cols-2 { display: block !important; }
        /* Fix for checklist items missing icons in print */
        .flex.items-center.gap-4 { display: flex !important; align-items: center !important; }
      </style>
    `;

    const opt = {
      margin:       10,
      filename:     `Journal_${format(selectedDate, 'yyyy-MM-dd')}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false, width: 800 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(exportContainer).save();
    } catch (e) {
      console.error(e);
      alert('Export failed.');
    } finally {
      document.body.removeChild(exportContainer);
    }
  };

  const exportWord = () => {
    if (!journalRef.current) return;
    
    const title = reflectionMode === 'Daily' ? `Daily Reflection - ${format(selectedDate, 'MMM d, yyyy')}` : `${reflectionMode} Performance Report`;
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40pt; color: #334155; }
          h1 { color: #064e3b; font-size: 26pt; font-weight: bold; }
          h3 { color: #065f46; font-size: 14pt; margin-top: 15pt; font-weight: bold; border-bottom: 1pt solid #10b981; padding-bottom: 5pt; }
          p { margin-bottom: 10pt; line-height: 1.5; }
          .block { border: 1pt solid #ecfdf5; padding: 15pt; margin: 15pt 0; background-color: #f0fdf4; border-radius: 10pt; }
          table { width: 100% !important; border-collapse: collapse; margin: 15pt 0; }
          th, td { border: 1pt solid #e2e8f0; padding: 8pt; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
        </style>
      </head>
      <body>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 5pt solid #10b981; margin-bottom: 30pt;">
          <tr>
            <td style="padding-bottom: 15pt;">
              <h1 style="margin: 0;">${title}</h1>
              <p style="font-size: 10pt; color: #64748b; margin: 5pt 0 0 0; text-transform: uppercase;">Self-Reflection Masterpost • ${new Date().toLocaleDateString()}</p>
            </td>
          </tr>
        </table>
        ${journalRef.current.innerHTML.replace(/<button[^>]*>.*?<\/button>/g, '')}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Journal_Export.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportImage = async () => {
    if (!journalRef.current) return;
    
    const exportContainer = document.createElement('div');
    exportContainer.style.width = '1000px';
    exportContainer.style.padding = '60px';
    exportContainer.style.backgroundColor = '#ffffff';
    exportContainer.style.color = '#064e3b';
    exportContainer.style.fontFamily = "'Inter', sans-serif";
    exportContainer.style.position = 'absolute';
    exportContainer.style.left = '-9999px';
    document.body.appendChild(exportContainer);
    
    const title = reflectionMode === 'Daily' ? `DAILY REFLECTION - ${format(selectedDate, 'MMM d, yyyy')}` : `${reflectionMode.toUpperCase()} PERFORMANCE ASSET`;

    exportContainer.innerHTML = `
      <div style="margin-bottom: 40px; border-bottom: 8px solid #10b981; padding-bottom: 30px;">
        <h1 style="font-size: 36pt; font-weight: 955; color: #064e3b; margin: 0; letter-spacing: -2.5px; line-height: 1;">${title}</h1>
        <div style="display: flex; align-items: center; gap: 15px; margin-top: 15px;">
           <div style="height: 2px; width: 40px; background: #10b981;"></div>
           <p style="font-size: 12pt; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 5px; font-weight: 800;">Strategic Mindset Protocol</p>
        </div>
      </div>
      <div class="content" style="line-height: 1.9; font-size: 14pt; color: #1e293b;">
        ${journalRef.current.innerHTML}
      </div>
      <style>
        .content h3 { font-size: 22pt; font-weight: 955; color: #065f46; margin-top: 40px; margin-bottom: 20px; border-left: 10px solid #10b981; padding-left: 20px; }
        .content p { margin-bottom: 25px; }
        .content .block { border: 4px solid #f0fdf4; border-radius: 32px; padding: 40px; margin: 40px 0; background: #fafdfc; }
        button, .no-print, input[type="checkbox"], .task-checkbox { display: none !important; }
        .flex { display: block !important; }
        .text-black\\/70 { color: #1e293b !important; }
      </style>
    `;
    
    try {
      const canvas = await html2canvas(exportContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Journal_Insight_${format(selectedDate, 'yyyy-MM-dd')}.png`;
      link.click();
    } catch (e) {
      console.error(e);
      alert('Image export failed.');
    } finally {
      document.body.removeChild(exportContainer);
    }
  };

  const generateDailyPrompt = async (force: boolean = false) => {
    if (promptLoading) return;
    
    // Check local storage cache first if not forced
    const cacheKey = `ai_reflection_prompt_${dateKey}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached && !force) {
      setPromptText(cached);
      return;
    }
    
    setPromptLoading(true);
    setPromptText('');
    
    try {
      const habits = data.habits || [];
      const completions = data.habitCompletions || {};
      const today = new Date();
      
      const summaryList = habits.map(habit => {
        let completedCount = 0;
        for (let i = 0; i < 7; i++) {
          const dayToCheck = subDays(today, i);
          const formattedDay = format(dayToCheck, 'yyyy-MM-dd');
          const comp = completions[formattedDay]?.[habit.id];
          const isCompleted = habit.isNumeric
            ? (typeof comp === 'number' ? comp >= (habit.targetValue || 1) : !!comp)
            : !!comp;
          if (isCompleted) {
            completedCount++;
          }
        }
        return `"${habit.name}" (completed ${completedCount}/7 days)`;
      });
      
      const habitsSummary = summaryList.length > 0 
        ? summaryList.join(', ')
        : 'No habits tracked recently';
        
      const userPrompt = `My recent 7-day habit completion statistics are:\n${habitsSummary}\n\nBased on this progress, please generate a single, highly engaging, provocative other-centered or psychological journal prompt (1-2 sentences maximum, no meta text) that challenges or inspires me to grow today. Do not use quotes around the prompt. Make it deeply inspiring!`;
      
      const systemInstruction = `You are an elite, performance-focused psychologist and high-performance coach. Generate exactly one highly impactful, thought-provoking reflective prompt for a user's journal. Direct, concise, maximum 30 words. No intro or explanation, no quotes, just return the prompt itself.`;
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          systemInstruction,
          model: 'gemini-3.5-flash'
        })
      });
      
      if (response.ok) {
        const resData = await response.json();
        const text = resData.text?.trim() || "What is one small choice you can make today to increase your personal alignment and consistency?";
        localStorage.setItem(cacheKey, text);
        setPromptText(text);
      } else {
        setPromptText("What is one small choice you can make today to increase your personal alignment and consistency?");
      }
    } catch (e) {
      console.error(e);
      setPromptText("What is one small choice you can make today to increase your personal alignment and consistency?");
    } finally {
      setPromptLoading(false);
    }
  };

  const generateWeeklyAIInsight = async () => {
    setWeeklyInsightLoading(true);
    setWeeklyInsightError(null);
    try {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end });
      const weekKey = format(start, 'yyyy-MM-dd');

      const entriesList = days.map(day => {
        const dateK = format(day, 'yyyy-MM-dd');
        const entry = data.journalEntries?.[dateK];
        if (!entry) return null;
        return {
          date: dateK,
          achievements: entry.achievements?.filter(Boolean) || [],
          affirmation: entry.affirmation || '',
          gratitude: entry.gratitude || '',
          feeling: entry.feeling || '',
          appreciation: entry.appreciation || '',
          learning: entry.learning || '',
          inspiration: entry.inspiration || '',
          discipline: entry.discipline || '',
          energyRating: entry.energyRating,
          focusRating: entry.focusRating,
          productivityRating: entry.productivityRating,
          stressRating: entry.stressRating
        };
      }).filter(Boolean);

      if (entriesList.length === 0) {
        setWeeklyInsightError("No daily reflections have been logged for this week yet. Please complete at least one reflection before running the AI analyzer.");
        setWeeklyInsightLoading(false);
        return;
      }

      const userPrompt = `You are a world-class high-performance coach and specialized analytical psychologist.
Evaluate the following complete journal entries and reflect on ratings submitted by the user this week to detect recurring emotional patterns, focus trends, accomplishments, and hidden growth obstacles:

${JSON.stringify(entriesList, null, 2)}

Provide a deeply moving, direct, and practical weekly theme report. Structure it as a high-density dashboard summary with subheadings:
1. **Recurring Mental & Emotional Themes**: Analyze emotional undertones, repeated thoughts, and focus patterns.
2. **Key High-Performance Indicators**: Relate achievements to focus/energy ratings and suggest how to optimize focus blocks or restore vitality.
3. **Proactive Self-Actualization Steps**: Provide 3 operational, highly direct checklist items they should act on next week.

Keep the advice direct, mature, and completely focused on human performance. Avoid code blocks, boilerplate, or markdown wraps. Formulate it directly with elegant semantic design.`;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          systemInstruction: 'You are an elite cognitive-behavioral coach and clinical psychologist. Return your themes report styled with clean spacing.',
          model: 'gemini-3.5-flash'
        })
      });

      if (response.ok) {
        const resData = await response.json();
        const text = resData.text || "Insight could not be compiled. Try again!";
        
        onUpdate({
          ...data,
          settings: {
            ...data.settings,
            fontSize: data.settings?.fontSize || 12,
            fontFamily: data.settings?.fontFamily || "'Inter', sans-serif",
            weeklyAIInsight: {
              ...(data.settings?.weeklyAIInsight || {}),
              [weekKey]: text
            }
          }
        });
      } else {
        setWeeklyInsightError("The server was unable to generate the insight. Please check your internet connection.");
      }
    } catch (e: any) {
      console.error(e);
      setWeeklyInsightError("An error occurred while compiling your weekly themes: " + e.message);
    } finally {
      setWeeklyInsightLoading(false);
    }
  };

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

  // Trigger daily reflection prompt generation
  useEffect(() => {
    if (reflectionMode === 'Daily') {
      generateDailyPrompt();
    }
  }, [dateKey, reflectionMode]);

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
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
        </div>
        <span className={`text-lg font-black text-${color}-600 dark:text-${color}-400`}>{value || 0}/10</span>
      </div>
      <div className="flex gap-1">
        {[1,2,3,4,5,6,7,8,9,10].map(num => (
          <button 
            key={num}
            onClick={() => onChange(num)}
            className={`flex-1 h-8 rounded-lg transition-all border ${value === num ? `bg-${color}-500 border-${color}-600 shadow-lg shadow-${color}-500/20` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          />
        ))}
      </div>
    </div>
  );

  const getWeeklyDigest = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    
    let weeklyAchievements: string[] = [];
    let weeklyGratitudes: string[] = [];
    
    days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const entry = data.journalEntries?.[dateKey];
      if (entry) {
        if (entry.achievements && entry.achievements.length > 0) {
          const validAch = entry.achievements.filter(a => a && a.trim() !== '' && !a.includes('[object Object]')).map(a => a.replace(/<[^>]*>?/gm, '').trim());
          weeklyAchievements.push(...validAch);
        }
        if (entry.gratitude && entry.gratitude.trim() !== '') {
          weeklyGratitudes.push(entry.gratitude.replace(/<[^>]*>?/gm, '').trim());
        }
      }
    });

    return { achievements: weeklyAchievements.filter(Boolean), gratitudes: weeklyGratitudes.filter(Boolean) };
  };

  const weeklyDigest = getWeeklyDigest();

  return (
    <div className="flex-1 flex flex-col h-full bg-white/[0.01] backdrop-blur-3xl p-3 md:p-8 overflow-y-auto md:overflow-hidden font-sans text-slate-900 transition-colors">
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
          <div className="relative group no-print">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-slate-800 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all border border-slate-200/50 shadow-sm backdrop-blur-xl group cursor-pointer active:scale-95"
                title="Export your reflection"
              >
                <Download size={16} className="text-emerald-600" />
                Export
                <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 z-[250] w-[200px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-150">
                  <button 
                    onClick={() => { exportWord(); setShowExportMenu(false); }}
                    className="flex items-center justify-between w-full text-left px-3 py-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl transition-colors font-bold text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={14} className="text-blue-500" /> MS Word Document
                    </span>
                  </button>
                  <button 
                    onClick={() => { exportPDF(); setShowExportMenu(false); }}
                    className="flex items-center justify-between w-full text-left px-3 py-2.5 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-xl transition-colors font-bold text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <FileDown size={14} className="text-red-500" /> PDF Document
                    </span>
                  </button>
                  <button 
                    onClick={() => { exportImage(); setShowExportMenu(false); }}
                    className="flex items-center justify-between w-full text-left px-3 py-2.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl transition-colors font-bold text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <Palette size={14} className="text-emerald-500" /> High-Res Image
                    </span>
                  </button>
                </div>
              )}
          </div>

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
        <div ref={journalRef} className="max-w-4xl mx-auto space-y-6">
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
                {/* AI Reflection Prompt of the Day */}
                <motion.div 
                  initial={{ opacity: 0, y: -20 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 rounded-[32px] p-6 border-2 border-emerald-500/20 relative overflow-hidden backdrop-blur-md shadow-lg"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full filter blur-2xl pointer-events-none"></div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-md shadow-emerald-500/10 shrink-0">
                        <Sparkles size={20} className={promptLoading ? "animate-spin" : ""} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">AI Daily Reflection Prompt</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Personalized</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight italic mt-1 font-sans leading-snug">
                          {promptLoading ? (
                             <span className="flex items-center gap-2 text-slate-400">
                               <RefreshCw size={14} className="animate-spin" />
                               Analyzing your habits and preparing custom growth prompt...
                             </span>
                          ) : (
                             promptText || "What is one small choice you can make today to increase your personal alignment and consistency?"
                          )}
                        </h2>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => generateDailyPrompt(true)}
                      disabled={promptLoading}
                      type="button"
                      className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shrink-0 disabled:opacity-50"
                      title="Regenerate Reflection Prompt"
                    >
                      <RefreshCw size={16} className={promptLoading ? "animate-spin" : ""} />
                    </button>
                  </div>
                  
                  {!promptLoading && promptText && (
                    <div className="mt-4 pt-4 border-t border-slate-200/50 flex gap-2">
                      <button
                        onClick={() => {
                          let currentAffirmation = (localEntry || currentEntry).affirmation || '';
                          if (typeof currentAffirmation !== 'string') {
                            currentAffirmation = '';
                          }
                          const cleanText = promptText.replace(/"/g, "'");
                          const separator = currentAffirmation.trim() ? '\n\n' : '';
                          updateEntry('affirmation', currentAffirmation + separator + `Daily spark reflection: "${cleanText}"`);
                        }}
                        type="button"
                        className="text-[10px] bg-white/60 hover:bg-emerald-100/80 text-emerald-700 font-extrabold uppercase tracking-wider px-4 py-2 rounded-xl transition-all border border-emerald-500/10"
                      >
                        Set as Affirmation Focus
                      </button>
                    </div>
                  )}
                </motion.div>

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

                <JournalBlock title={<span className="flex items-center gap-2">Performance Metrics (1-10) <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`; let val = (localEntry || currentEntry).appreciation || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateEntry('appreciation', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Zap className="text-orange-600" size={20} />} bgColor={selectedPaper.className}>
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

                <JournalBlock title={<span className="flex items-center gap-2">What are the great things that happened today? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul>`; let val = (localEntry || currentEntry).inspiration || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateEntry('inspiration', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Quote className="text-emerald-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv 
                    value={(localEntry || currentEntry).inspiration || ''} 
                    onFocus={() => setActiveField('inspiration')}
                    onBlur={() => setActiveField(null)}
                    onChange={(val) => updateEntry('inspiration', val)} 
                    placeholder="Moments of joy..."
                    className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-24" 
                    style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }}
                  />
                </JournalBlock>

                <JournalBlock title={<span className="flex items-center gap-2">What is one thing I learned today? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul>`; let val = (localEntry || currentEntry).learning || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateEntry('learning', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Lightbulb className="text-emerald-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv 
                    value={(localEntry || currentEntry).learning || ''} 
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
                  {/* AI Weekly Themes & Insights */}
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 rounded-[32px] p-6 border border-purple-500/20 relative overflow-hidden backdrop-blur-md shadow-xl"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 border-b border-purple-500/15 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
                          <Sparkles size={20} className={weeklyInsightLoading ? "animate-spin" : ""} />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">AI Deep Coaching</span>
                          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight italic uppercase mt-0.5">AI Weekly Journal Insights</h2>
                        </div>
                      </div>
                      
                      <button
                        id="generate-weekly-themes-insight-btn"
                        onClick={generateWeeklyAIInsight}
                        disabled={weeklyInsightLoading}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-purple-500/10 disabled:opacity-50 select-none hover:scale-105 active:scale-95"
                      >
                        {weeklyInsightLoading ? 'Analyzing...' : 'Generate Theme Insight'}
                      </button>
                    </div>

                    {weeklyInsightError && (
                      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold leading-normal">
                        ⚠️ {weeklyInsightError}
                      </div>
                    )}

                    {weeklyInsightLoading && (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                        <RefreshCw size={24} className="text-purple-600 animate-spin" />
                        <span className="text-xs font-black uppercase tracking-wider text-purple-600/70">Scanning the week's inputs, achievements, and sentiment trends...</span>
                      </div>
                    )}

                    {!weeklyInsightLoading && !weeklyInsightError && (
                      <div>
                        {data.settings?.weeklyAIInsight?.[format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')] ? (
                          <div className="text-slate-850 dark:text-slate-100 text-sm font-semibold space-y-4 prose prose-indigo max-w-none pt-2">
                            {/* Format AI output nicely with white-space support */}
                            <div className="whitespace-pre-line leading-relaxed tracking-wide bg-white/40 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-250/20">
                              {data.settings?.weeklyAIInsight?.[format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')]}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-xs text-slate-400 font-bold italic">No theme insight generated for this week yet. Click the button above to analyze patterns in your journal entries.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>

                  {/* Weekly Digest Autogenerated */}
                  <JournalBlock title="Weekly Digest (Auto-Generated)" icon={<Sparkles className="text-amber-500" size={20} />} bgColor={selectedPaper.className}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                       <div>
                          <h4 className="text-[10px] uppercase font-black tracking-widest text-emerald-600 mb-3 border-b border-emerald-500/20 pb-2">Achievements & Priorities</h4>
                          {weeklyDigest.achievements.length > 0 ? (
                            <ul className="space-y-2 list-none">
                              {weeklyDigest.achievements.map((ach, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-white/40 p-2 rounded-lg border border-slate-100">
                                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{ach}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No achievements logged this week.</p>
                          )}
                       </div>
                       <div>
                          <h4 className="text-[10px] uppercase font-black tracking-widest text-rose-600 mb-3 border-b border-rose-500/20 pb-2">Gratitude Notes</h4>
                          {weeklyDigest.gratitudes.length > 0 ? (
                            <ul className="space-y-2 list-none">
                              {weeklyDigest.gratitudes.map((grat, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-white/40 p-2 rounded-lg border border-slate-100">
                                  <Heart size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                  <span>{grat}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No gratitude notes logged this week.</p>
                          )}
                       </div>
                    </div>
                  </JournalBlock>

                  <JournalBlock title={<span className="flex items-center gap-2">Weekly Review - Did I work on my goals? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul>`; let val = data.reflections?.weeklyReview?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('weeklyReview', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Target className="text-emerald-600" size={20} />} bgColor={selectedPaper.className}>
                    <RichTextDiv value={data.reflections?.weeklyReview?.content || ''} onChange={(val) => updateReflection('weeklyReview', val)} placeholder="Review your goals and progress this week..." className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                  </JournalBlock>
                  <JournalBlock title={<span className="flex items-center gap-2">What needs adjustment for next week? <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul>`; let val = data.reflections?.sixMonthVision?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('sixMonthVision', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Zap className="text-orange-600" size={20} />} bgColor={selectedPaper.className}>
                    <RichTextDiv value={data.reflections?.sixMonthVision?.content || ''} onChange={(val) => updateReflection('sixMonthVision', val)} placeholder="Identify changes to stay on track..." className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                  </JournalBlock>
                  <JournalBlock title={<span className="flex items-center gap-2">Key Successes & Learnings this week <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul>`; let val = data.reflections?.oneYearVision?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('oneYearVision', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Lightbulb className="text-emerald-600" size={20} />} bgColor={selectedPaper.className}>
                    <RichTextDiv value={data.reflections?.oneYearVision?.content || ''} onChange={(val) => updateReflection('oneYearVision', val)} placeholder="What was your biggest win?" className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                  </JournalBlock>
              </motion.div>
            ) : reflectionMode === 'Monthly' ? (
              <motion.div key="monthly" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <JournalBlock title={<span className="flex items-center gap-2">Monthly Master - Key Achievements <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul>`; let val = data.reflections?.monthlyChallenge?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('monthlyChallenge', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<ShieldCheck className="text-emerald-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv value={data.reflections?.monthlyChallenge?.content || ''} onChange={(val) => updateReflection('monthlyChallenge', val)} placeholder="Reflect on your biggest wins this month..." className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                </JournalBlock>
                <JournalBlock title={<span className="flex items-center gap-2">Core Growth Area & Major Learnings <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul>`; let val = data.reflections?.threeMonthVision?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('threeMonthVision', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Lightbulb className="text-amber-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv value={data.reflections?.threeMonthVision?.content || ''} onChange={(val) => updateReflection('threeMonthVision', val)} placeholder="What was the most significant area of maturity this month?" className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                </JournalBlock>
              </motion.div>
            ) : reflectionMode === '3Month' ? (
              <motion.div key="3month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <JournalBlock title={<span className="flex items-center gap-2">90-Day Vision Evolution <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul>`; let val = data.reflections?.threeMonthVision?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('threeMonthVision', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Sparkles className="text-purple-600" size={20} />} bgColor={selectedPaper.className}>
                  <RichTextDiv value={data.reflections?.threeMonthVision?.content || ''} onChange={(val) => updateReflection('threeMonthVision', val)} placeholder="How has your 3-month vision shifted since the start?" className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />
                </JournalBlock>
                <JournalBlock title={<span className="flex items-center gap-2">The Next Plateau for Peak Performance <button onClick={() => { const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul>`; let val = data.reflections?.sixMonthVision?.content || ''; if(typeof val !== 'string' || val === '[object Object]') val = ''; updateReflection('sixMonthVision', val + html); }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></span>} icon={<Target className="text-rose-600" size={20} />} bgColor={selectedPaper.className}>
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
