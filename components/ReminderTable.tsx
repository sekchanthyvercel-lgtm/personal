import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  Plus, 
  Trash2, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  FilterX,
  LayoutGrid,
  Eye,
  EyeOff
} from 'lucide-react';
import { Student, FilterState, UserRole } from '../types';
import { format } from 'date-fns';

const MultilineInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}> = ({ value, onChange, className, style, placeholder }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.max(36, scrollHeight) + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className={className}
      style={{ ...style, resize: 'none', overflow: 'hidden', display: 'block' }}
    />
  );
};

interface ReminderTableProps {
  students: Student[];
  onAddStudent: (defaults?: Partial<Student>) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
  onClearCategory: (categories: string[]) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  role: UserRole;
  settings?: any;
  onUpdateSettings?: (settings: any) => void;
}

const ReminderTable: React.FC<ReminderTableProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onClearCategory,
  filters,
  setFilters,
  role,
  settings,
  onUpdateSettings
}) => {
  const filteredReminders = students
    .filter(s => s.category === 'Reminder')
    .filter(s => {
      const query = (filters.searchQuery || '').toLowerCase();
      return (s.name || '').toLowerCase().includes(query) || 
             (s.note || '').toLowerCase().includes(query) ||
             (s.status || '').toLowerCase().includes(query);
    });

  const isoToDisplay = (iso: string) => {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y.slice(2)}`;
  };

  const displayToIso = (display: string) => {
      if (!display || !display.includes('/')) return '';
      const [d, m, y] = display.split('/');
      return `20${y}-${m}-${d}`;
  };

  const updateField = (id: string, field: string, value: any) => {
    let updates: any = { [field]: value };
    
    // Auto-fill deadline if task name is entered and deadline is empty
    if (field === 'name' && value && !students.find(s => s.id === id)?.deadline) {
        updates.deadline = format(new Date(), 'dd/MM/yy');
    }
    
    onUpdateStudent(id, updates);
  };

  const getRowBg = (idx: number) => {
    const colors = [
      'bg-emerald-400/5',
      'bg-emerald-400/5',
      'bg-amber-400/5',
      'bg-indigo-400/5',
      'bg-rose-400/5',
      'bg-violet-400/5',
      'bg-teal-400/5',
      'bg-orange-400/5'
    ];
    return colors[idx % colors.length];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-emerald-500';
      case 'In Progress': return 'text-emerald-500';
      case 'Urgent': return 'text-orange-500';
      default: return 'text-slate-400';
    }
  };

  const fontFamilies = [
    { name: 'Modern', value: "Inter, sans-serif" },
    { name: 'Display', value: "Space Grotesk, sans-serif" },
    { name: 'Elegant', value: "Playfair Display, serif" },
    { name: 'Technical', value: "JetBrains Mono, monospace" },
    { name: 'Handwritten', value: "cursive" }
  ];

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden p-4 md:p-6 lg:p-8 text-slate-900">
      {/* Header Bar */}
      <div className="bg-white/[0.01] backdrop-blur-3xl rounded-[32px] p-6 mb-6 flex flex-wrap items-center justify-between shadow-sm border border-white/10 gap-4 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
            <Bell size={24} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none italic">Reminder Hub</h1>
            <p className="text-[10px] font-bold text-slate-900/60 uppercase tracking-widest mt-1">Staff Tasks & Notifications</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search reminders..." 
              className="w-full h-10 pl-10 pr-4 bg-white/50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
              value={filters.searchQuery}
              onChange={e => setFilters({...filters, searchQuery: e.target.value})}
            />
          </div>

          <button 
            onClick={() => onAddStudent({ category: 'Reminder' })}
            className="flex items-center gap-2 h-10 px-5 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={3} /> New Reminder
          </button>

          <button 
            onClick={() => setFilters({ ...filters, showHidden: !filters.showHidden })}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${filters.showHidden ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
            title={filters.showHidden ? "Hide Hidden Tasks" : "Show Hidden Tasks"}
          >
            {filters.showHidden ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          
          {role === 'Admin' && (
            <button 
              onClick={() => onClearCategory(['Reminder'])}
              className="w-10 h-10 bg-orange-50 text-orange-500 border border-orange-100 rounded-xl flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all shadow-sm"
              title="Clear All Reminders"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white/[0.01] backdrop-blur-3xl rounded-[40px] shadow-2xl border border-white/10 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full border-collapse table-fixed min-w-[900px]">
            <thead className="sticky top-0 z-40 bg-white/10 backdrop-blur-xl">
              <tr className="border-b border-white/20">
                <th className="w-16 h-14 text-[10px] font-black text-slate-900 uppercase tracking-widest">#</th>
                <th className="w-64 text-left px-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Task / Item</th>
                <th className="w-40 text-center text-[10px] font-black text-slate-900 uppercase tracking-widest">Deadline</th>
                <th className="w-40 text-center text-[10px] font-black text-slate-900 uppercase tracking-widest">Status</th>
                <th className="text-left px-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Notes</th>
                <th className="w-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-sans">
              {filteredReminders
                .filter(s => filters.showHidden || !s.isHidden)
                .map((s, idx) => (
                <tr key={s.id} className={`group hover:bg-white/30 transition-all h-11 ${getRowBg(idx)} ${s.isHidden ? 'opacity-50' : ''}`}>
                  <td className="text-center text-[10px] font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4">
                    <MultilineInput 
                      value={s.name} 
                      onChange={val => updateField(s.id, 'name', val)}
                      placeholder="Enter task name..."
                      style={{ 
                        fontFamily: settings?.fontFamily || "Inter, sans-serif",
                        fontSize: `${settings?.fontSize || 12}px`
                      }}
                      className="w-full bg-transparent font-black text-slate-900 outline-none placeholder:text-slate-500"
                    />
                  </td>
                  <td className="px-4">
                    <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white/30 rounded-lg border border-white/20">
                        <Calendar size={12} className="text-orange-400" />
                        <input 
                          type="date"
                          value={displayToIso(s.deadline || '')} 
                          onChange={e => updateField(s.id, 'deadline', isoToDisplay(e.target.value))}
                          style={{ 
                            fontFamily: settings?.fontFamily || "Inter, sans-serif",
                            fontSize: `${settings?.fontSize || 10}px`
                          }}
                          className="w-full bg-transparent font-black text-slate-600 outline-none text-center cursor-pointer"
                        />
                    </div>
                  </td>
                  <td className="px-4 text-center">
                    <select 
                      value={s.status || 'Pending'} 
                      onChange={e => updateField(s.id, 'status', e.target.value)}
                      style={{ 
                        fontFamily: settings?.fontFamily || "Inter, sans-serif",
                        fontSize: `${settings?.fontSize || 10}px`
                      }}
                      className={`bg-transparent font-black outline-none appearance-none cursor-pointer ${getStatusColor(s.status)}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </td>
                  <td className="px-4">
                    <MultilineInput 
                      value={s.note || ''} 
                      onChange={val => updateField(s.id, 'note', val)}
                      placeholder="Add details..."
                      style={{ 
                        fontFamily: settings?.fontFamily || "Inter, sans-serif",
                        fontSize: `${Math.max(10, (settings?.fontSize || 11) - 1)}px`
                      }}
                      className="w-full bg-transparent font-bold text-slate-500 outline-none placeholder:text-slate-200"
                    />
                  </td>
                  <td className="text-center px-4">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => updateField(s.id, 'isHidden', !s.isHidden)}
                        className={`p-1.5 rounded-lg transition-all ${s.isHidden ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-600'}`}
                        title={s.isHidden ? "Unhide" : "Hide"}
                      >
                        {s.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button 
                        onClick={() => onDeleteStudent(s.id)}
                        className="p-1.5 text-slate-300 hover:text-orange-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReminders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Bell size={48} />
                      <p className="text-xs font-black uppercase tracking-widest">No reminders set</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReminderTable;
