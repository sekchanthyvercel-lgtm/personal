import React, { useRef, useState } from 'react';
import { AppData, ReflectionData, ReflectionEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Target, Compass, Award, Flag, Wand2, Loader2, RefreshCw, CheckSquare, Palette, Download, FileText, FileDown, ChevronDown } from 'lucide-react';
import { PAPER_STYLES } from '../src/styles/paperStyles';
import { format, subDays, eachDayOfInterval, startOfWeek } from 'date-fns';
import { callNeuralEngine } from '../services/neuralEngine';
import { RichTextDiv } from './FloatingToolbar';
// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import html2canvas from 'html2canvas';
import Markdown from 'react-markdown';

interface ReflectionsProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
}

interface ReflectionCardProps {
  title: string;
  icon: any;
  value: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  colorClass: string;
  subtitle: string;
  paperClassName: string;
}

const ReflectionCard: React.FC<ReflectionCardProps> = ({ 
  title, 
  icon: Icon, 
  value, 
  onChange, 
  onFocus,
  onBlur,
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
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-2">
            {title}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`;
                  let safeValue = typeof value === 'string' ? value : '';
                  if (safeValue === '[object Object]') safeValue = '';
                  onChange(safeValue + html);
                }}
                className="text-slate-400 hover:text-emerald-600 transition-colors" 
                title="Insert Checklist"
              >
                <CheckSquare size={16} />
              </button>
            </div>
          </h3>
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
    
    <RichTextDiv
      value={typeof value === 'string' && value !== '[object Object]' ? value : ''}
      onChange={(val) => onChange(val)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={`Type your goals and vision here...`}
      className={`w-full border border-white/20 rounded-[24px] p-6 text-slate-900 text-base font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[180px] transition-all placeholder:text-slate-900/20 block custom-scrollbar ${paperClassName}`}
    />
  </motion.div>
);

 export const Reflections: React.FC<ReflectionsProps> = ({ data, onUpdate }) => {
  const [showHistory, setShowHistory] = React.useState(false);
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [summary, setSummary] = React.useState<string | null>(null);
  
  // Local state for auto-syncing inputs to prevent cursor jumping
  const [localReflections, setLocalReflections] = React.useState<Record<string, string>>({});
  const [activeField, setActiveField] = React.useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const exportPDF = async () => {
    if (!summaryRef.current) return;
    
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
    
    const title = (data.settings as any)?.name || 'Growth Mastery Summary';
    exportContainer.innerHTML = `
      <div style="margin-bottom: 30px; border-bottom: 4px solid #ea580c; padding-bottom: 20px;">
        <h1 style="font-size: 28pt; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -1px;">${title}</h1>
        <p style="font-size: 11pt; color: #64748b; margin-top: 8px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">Strategic Reflection Summary • ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="reflection-content" style="line-height: 1.7; font-size: 12pt;">
        ${summaryRef.current.innerHTML}
      </div>
      <style>
        .reflection-content h2 { font-size: 20pt; font-weight: 900; margin-top: 30pt; color: #ea580c; border-bottom: 1px solid #fed7aa; padding-bottom: 10px; margin-bottom: 15pt; }
        .reflection-content h3 { font-size: 16pt; font-weight: 800; margin-top: 20pt; color: #1e293b; }
        .reflection-content p { margin-bottom: 14pt; color: #334155; }
        .reflection-content ul { margin-bottom: 14pt; padding-left: 20pt; }
        .reflection-content li { margin-bottom: 8pt; color: #475569; }
        .paper-ruled { background-image: linear-gradient(#f1f5f9 2px, transparent 2px) !important; background-size: 100% 2.25rem !important; }
        .paper-grid { background-image: linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px) !important; background-size: 1.5rem 1.5rem !important; }
        .paper-dots { background-image: radial-gradient(#e2e8f0 2px, transparent 2px) !important; background-size: 1.5rem 1.5rem !important; }
        .paper-engineering { background-color: #f0f9ff !important; background-image: linear-gradient(rgba(14, 165, 233, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.1) 1px, transparent 1px) !important; background-size: 1rem 1rem !important; }
        .synthesis-card-wrapper, .qa-board-wrapper { border: 2px solid #e2e8f0 !important; border-radius: 15px !important; padding: 25px !important; margin: 25px 0 !important; page-break-inside: avoid; background-color: #f8fafc !important; }
        .markdown-body table { width: 100% !important; border-collapse: collapse; margin: 20px 0; }
        .markdown-body th, .markdown-body td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
        .markdown-body th { background-color: #f1f5f9; font-weight: bold; }
      </style>
    `;

    const opt = {
      margin:       10,
      filename:     `Strategic_Summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false, width: 800 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(exportContainer).save();
    } catch (e) {
      console.error(e);
      alert('Export failed. Please try again.');
    } finally {
      document.body.removeChild(exportContainer);
    }
  };

  const exportWord = () => {
    if (!summaryRef.current) return;
    
    const title = (data.settings as any)?.name || 'Growth Mastery Summary';
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40pt; color: #334155; }
          h1 { color: #0f172a; font-size: 26pt; font-weight: bold; }
          h2 { color: #ea580c; font-size: 18pt; margin-top: 25pt; font-weight: bold; }
          h3 { color: #1e293b; font-size: 14pt; margin-top: 15pt; font-weight: bold; }
          p { margin-bottom: 10pt; line-height: 1.5; }
          .synthesis-card-wrapper, .qa-board-wrapper { 
            border: 1pt solid #cbd5e1; 
            padding: 15pt; 
            margin: 15pt 0; 
            background-color: #f8fafc;
          }
          table { width: 100% !important; border-collapse: collapse; margin: 15pt 0; }
          th, td { border: 1pt solid #e2e8f0; padding: 8pt; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; color: #475569; }
        </style>
      </head>
      <body>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 4px solid #ea580c; margin-bottom: 30pt;">
          <tr>
            <td style="padding-bottom: 15pt;">
              <h1 style="margin: 0;">${title}</h1>
              <p style="font-size: 10pt; color: #64748b; margin: 5pt 0 0 0; text-transform: uppercase;">Strategic Reflection Summary • ${new Date().toLocaleDateString()}</p>
            </td>
          </tr>
        </table>
        ${summaryRef.current.innerHTML}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Strategic_Summary.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportImage = async () => {
    if (!summaryRef.current) return;
    
    const exportContainer = document.createElement('div');
    exportContainer.style.width = '800px';
    exportContainer.style.padding = '50px';
    exportContainer.style.backgroundColor = '#ffffff';
    exportContainer.style.color = '#000';
    exportContainer.style.fontFamily = "'Inter', sans-serif";
    exportContainer.style.position = 'absolute';
    exportContainer.style.left = '-9999px';
    document.body.appendChild(exportContainer);
    
    const title = (data.settings as any)?.name || 'Growth Mastery Summary';
    exportContainer.innerHTML = `
      <div style="margin-bottom: 30px; border-bottom: 5px solid #ea580c; padding-bottom: 25px;">
        <h1 style="font-size: 32pt; font-weight: 950; color: #0f172a; margin: 0; letter-spacing: -2px;">${title}</h1>
        <p style="font-size: 12pt; color: #64748b; margin-top: 10px; text-transform: uppercase; letter-spacing: 4px; font-weight: 800;">Strategic Masterplan Summary</p>
      </div>
      <div class="content" style="line-height: 1.8; font-size: 13pt; color: #1e293b;">
        ${summaryRef.current.innerHTML}
      </div>
      <style>
        .content h2 { font-size: 24pt; font-weight: 950; color: #ea580c; margin-top: 40px; margin-bottom: 20px; border-left: 8px solid #ea580c; padding-left: 20px; }
        .content h3 { font-size: 18pt; font-weight: 800; color: #1e293b; margin-top: 30px; }
        .content p { margin-bottom: 20px; }
        .content ul { margin-bottom: 20px; padding-left: 30px; }
        .content li { margin-bottom: 10px; }
        .synthesis-card-wrapper, .qa-board-wrapper { border: 3px solid #f1f5f9; background: #f8fafc; border-radius: 24px; padding: 30px; margin: 30px 0; }
      </style>
    `;
    
    try {
      const canvas = await html2canvas(exportContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Strategic_Summary_${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.click();
    } catch (e) {
      console.error(e);
      alert('Image export failed.');
    } finally {
      document.body.removeChild(exportContainer);
    }
  };


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

  // Generate rolling 365 days grouped by weeks (columns)
  const heatmapWeeks = React.useMemo(() => {
    try {
      const today = new Date();
      const startDate = subDays(today, 364); // 52 rolling weeks
      const startOfFirstWeek = startOfWeek(startDate); // Align to Sunday
      const allDays = eachDayOfInterval({ start: startOfFirstWeek, end: today });
      
      const weeks: Date[][] = [];
      let currentWeek: Date[] = [];
      
      allDays.forEach(day => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      });
      
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }
      
      return weeks;
    } catch (e) {
      console.error("Error generating heatmap:", e);
      return [];
    }
  }, [data.journalEntries]);

  // Sync prop data to local state when not focused
  React.useEffect(() => {
    const fields: (keyof ReflectionData)[] = ['weeklyReview', 'monthlyChallenge', 'threeMonthVision', 'sixMonthVision', 'oneYearVision'];
    const newLocal: Record<string, string> = { ...localReflections };
    let changed = false;

    fields.forEach(field => {
      if (activeField !== field) {
        const cloudContent = (reflections[field] as ReflectionEntry)?.content || '';
        if (newLocal[field] !== cloudContent) {
          newLocal[field] = cloudContent;
          changed = true;
        }
      }
    });

    if (changed) {
      setLocalReflections(newLocal);
    }
  }, [reflections, activeField]);

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
      
      // Update local too
      setLocalReflections(prev => ({ ...prev, [key]: '' }));
      onUpdate({ ...data, reflections: newReflections });
      return;
    }

    // Update local state immediately for responsiveness
    setLocalReflections(prev => ({ ...prev, [key]: content }));

    const newReflections = {
      ...reflections,
      [key]: { ...(reflections[key] as ReflectionEntry), content }
    };
    onUpdate({ ...data, reflections: newReflections });
  };

  const generateAISummary = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setSummary(null);

    const context = `
      Weekly Review: ${reflections.weeklyReview.content}
      Monthly Challenge: ${reflections.monthlyChallenge.content}
      3-Month Vision: ${reflections.threeMonthVision.content}
      6-Month Vision: ${reflections.sixMonthVision.content}
      1-Year Vision: ${reflections.oneYearVision.content}
    `;

    try {
      const result = await callNeuralEngine(
        'gemini-3-flash-preview',
        `Summarize my growth journey based on these reflections. Highlight key achievements, identify core patterns in my goals and vision, and suggest areas for improvement for the next quarter. Keep it concise, simple, professional, and empowering. Use sections with simple emojis.
        IMPORTANT instructions: Do NOT use any markdown symbols, meaning NO double asterisks (**), NO single asterisks (*) anywhere (not even for bullet points), and NO hash characters (#, ##). Use standard paragraphs separated by blank lines and clear emojis (🏆, 🎯, 📈) for bullet headings. No stars or markdown headers at all!
        Context: ${context}`,
        "You are an elite performance coach. Synthesize reflections into a cohesive growth strategy."
      );
      // Regex sanitize any stray stars/hashes
      const cleanText = result.text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/##/g, '')
        .replace(/#/g, '');
      setSummary(cleanText);
    } catch (e) {
      console.error(e);
      alert('Failed to generate summary.');
    } finally {
      setIsSummarizing(false);
    }
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
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={generateAISummary}
            disabled={isSummarizing}
            className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSummarizing ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
            AI Journey Summary
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex-1 md:flex-none px-6 py-3 bg-white/40 hover:bg-white/60 rounded-2xl text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all border border-white/40 shadow-sm"
          >
            {showHistory ? 'View Master Plan' : 'View Motivation Archives'}
          </button>
        </div>
      </div>

      {/* Visual Journal Consistency Heatmap */}
      <div className="relative overflow-visible rounded-[38px] p-8 bg-white/95 border-2 border-slate-200 shadow-xl mb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Calendar size={22} className="text-orange-500 animate-pulse" />
              Journal Consistency Heatmap
            </h2>
            <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider mt-0.5">Your daily reflections log over the rolling 365 days</p>
          </div>
          
          <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-600 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl shadow-sm">
            <span>Less</span>
            <div className="flex gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-slate-200 border border-slate-300" title="No journal logged" />
              <div className="w-4 h-4 rounded-sm bg-orange-100 border border-orange-200" title="1-2 ratings / simple journal present" />
              <div className="w-4 h-4 rounded-sm bg-orange-200 border border-orange-300" title="Journal logged" />
              <div className="w-4 h-4 rounded-sm bg-orange-400 border border-orange-500" title="High-quality reflection log" />
              <div className="w-4 h-4 rounded-sm bg-orange-600 border border-orange-700 shadow-sm shadow-orange-500/20" title="Deep reflection completed (4+ ratings)" />
            </div>
            <span>More Entries</span>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="overflow-x-auto custom-scrollbar-orange pb-4">
          <div className="flex gap-2 min-w-[850px] select-none items-start pt-1">
            {/* Days labels using matching 7-row layout for absolute alignment */}
            <div className="grid grid-rows-7 gap-1.5 pr-2 w-8 text-[9px] font-black text-slate-400 uppercase tracking-tighter text-right">
              <span className="h-3.5 flex items-center justify-end">Sun</span>
              <span className="h-3.5 flex items-center justify-end"></span>
              <span className="h-3.5 flex items-center justify-end">Tue</span>
              <span className="h-3.5 flex items-center justify-end"></span>
              <span className="h-3.5 flex items-center justify-end">Thu</span>
              <span className="h-3.5 flex items-center justify-end"></span>
              <span className="h-3.5 flex items-center justify-end">Sat</span>
            </div>

            {/* Weeks columns */}
            {heatmapWeeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-rows-7 gap-1.5">
                {week.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const entry = data.journalEntries?.[dateKey];
                  
                  // Level algorithm
                  let level = 0; // standard uncompleted
                  let tooltip = `${format(day, 'MMM do, yyyy')}: No entry`;
                  
                  if (entry) {
                    level = 1;
                    tooltip = `${format(day, 'MMM do, yyyy')}: Journal Entry present!`;
                    
                    const ratingCount = [
                      entry.energyRating,
                      entry.focusRating,
                      entry.productivityRating,
                      entry.stressRating,
                      entry.gratitudeRating,
                      entry.vitalityRating
                    ].filter(Boolean).length;

                    if (ratingCount >= 4) {
                      level = 4;
                      tooltip = `${format(day, 'MMM do, yyyy')}: Deep reflection journal completed! ⭐`;
                    } else if (ratingCount >= 2) {
                      level = 3;
                      tooltip = `${format(day, 'MMM do, yyyy')}: High-quality reflection log!`;
                    } else if (entry.isCompleted) {
                      level = 2;
                      tooltip = `${format(day, 'MMM do, yyyy')}: Journal logged!`;
                    }
                  }

                  const getCellBg = (lvl: number) => {
                    switch (lvl) {
                      case 1: return 'bg-orange-100 border border-orange-200 text-orange-700 hover:scale-130 hover:shadow-md';
                      case 2: return 'bg-orange-200 border border-orange-300 text-orange-850 hover:scale-130 hover:shadow-md';
                      case 3: return 'bg-orange-400 border border-orange-500 hover:scale-130 hover:shadow-md';
                      case 4: return 'bg-orange-600 border border-orange-700 hover:scale-130 hover:shadow-lg shadow-orange-500/30';
                      default: return 'bg-slate-200 border border-slate-350/60 hover:bg-slate-300 hover:scale-130 hover:border-slate-400';
                    }
                  };

                  return (
                    <div 
                      key={day.toString()}
                      className={`w-3.5 h-3.5 rounded-[3.5px] transition-all duration-150 cursor-pointer ${getCellBg(level)}`}
                      title={tooltip}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {summary && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-10 bg-white border-2 border-slate-200/90 p-8 rounded-[40px] shadow-2xl relative"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="relative z-[200]">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-bold transition-all"
                  title="Export notes"
                >
                  <Download size={14} className="text-slate-600" />
                  Export
                  <ChevronDown size={12} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
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
                onClick={() => setSummary(null)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                title="Clear summary"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            
            <div ref={summaryRef}>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-orange-100 border border-orange-200 rounded-2xl text-orange-600">
                  <Wand2 size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic">AI Evolution Strategic Summary</h2>
              </div>
              <div className="markdown-body prose prose-slate prose-p:leading-relaxed max-w-none text-slate-800 font-bold text-sm leading-relaxed">
                 <Markdown>{summary}</Markdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showHistory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pb-16">
          <ReflectionCard 
            title="Weekly Review" 
            subtitle="Wins & Adjustments"
            icon={Calendar}
            value={localReflections.weeklyReview ?? reflections.weeklyReview.content}
            onChange={(val) => {
              if (val === 'ARCHIVE') {
                handleUpdateReflection('weeklyReview', 'ARCHIVE');
              } else {
                handleUpdateReflection('weeklyReview', val);
              }
            }}
            onFocus={() => setActiveField('weeklyReview')}
            onBlur={() => setActiveField(null)}
            colorClass="bg-orange-500"
            paperClassName={selectedPaper.className}
          />
          <ReflectionCard 
            title="Monthly Challenge" 
            subtitle="30-Day Mastery Status"
            icon={Target}
            value={localReflections.monthlyChallenge ?? reflections.monthlyChallenge.content}
            onChange={(val) => {
              if (val === 'ARCHIVE') {
                handleUpdateReflection('monthlyChallenge', 'ARCHIVE');
              } else {
                handleUpdateReflection('monthlyChallenge', val);
              }
            }}
            onFocus={() => setActiveField('monthlyChallenge')}
            onBlur={() => setActiveField(null)}
            colorClass="bg-emerald-500"
            paperClassName={selectedPaper.className}
          />
          <ReflectionCard 
            title="3-Month Vision" 
            subtitle="Quarterly Evolution"
            icon={Compass}
            value={localReflections.threeMonthVision ?? reflections.threeMonthVision.content}
            onChange={(val) => {
              if (val === 'ARCHIVE') {
                handleUpdateReflection('threeMonthVision', 'ARCHIVE');
              } else {
                handleUpdateReflection('threeMonthVision', val);
              }
            }}
            onFocus={() => setActiveField('threeMonthVision')}
            onBlur={() => setActiveField(null)}
            colorClass="bg-indigo-500"
            paperClassName={selectedPaper.className}
          />
          <ReflectionCard 
            title="6-Month Vision" 
            subtitle="Bi-Annual Milestones"
            icon={Award}
            value={localReflections.sixMonthVision ?? reflections.sixMonthVision.content}
            onChange={(val) => {
              if (val === 'ARCHIVE') {
                handleUpdateReflection('sixMonthVision', 'ARCHIVE');
              } else {
                handleUpdateReflection('sixMonthVision', val);
              }
            }}
            onFocus={() => setActiveField('sixMonthVision')}
            onBlur={() => setActiveField(null)}
            colorClass="bg-purple-500"
            paperClassName={selectedPaper.className}
          />
          <ReflectionCard 
            title="1-Year Vision" 
            subtitle="Long-term Legacy"
            icon={Flag}
            value={localReflections.oneYearVision ?? reflections.oneYearVision.content}
            onChange={(val) => {
              if (val === 'ARCHIVE') {
                handleUpdateReflection('oneYearVision', 'ARCHIVE');
              } else {
                handleUpdateReflection('oneYearVision', val);
              }
            }}
            onFocus={() => setActiveField('oneYearVision')}
            onBlur={() => setActiveField(null)}
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
        .custom-scrollbar-orange::-webkit-scrollbar {
          height: 10px;
        }
        .custom-scrollbar-orange::-webkit-scrollbar-track {
          background: rgba(249, 115, 22, 0.05);
          border-radius: 6px;
        }
        .custom-scrollbar-orange::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.35);
          border-radius: 6px;
          border: 2px solid white;
        }
        .custom-scrollbar-orange::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.55);
        }
      `}</style>
    </div>
  );
};
