import React, { useRef } from 'react';
import { 
  LayoutDashboard, 
  LogOut, 
  CalendarCheck, 
  Contact, 
  LayoutGrid,
  ChevronDown,
  Eye,
  EyeOff,
  ChevronLeft,
  Menu,
  User as UserIcon,
  UserCheck,
  BookOpen,
  FilterX,
  Zap,
  ClipboardList,
  Bell,
  Image as ImageIcon,
  Trash2,
  FileText,
  Wallet,
  RotateCcw,
  RotateCw,
  GraduationCap,
  Settings,
  Sparkles
} from 'lucide-react';
import { Tab, UserRole, AppSettings, ViewMode, StudentCategory, AppData } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onLogout: () => void;
  role: UserRole;
  onSettingsOpen: () => void;
  filters: any;
  setFilters: (f: any) => void;
  uniqueTeachers: string[];
  uniqueAssistants: string[];
  uniqueTimes: string[];
  uniqueLevels?: string[];
  uniqueBehaviors?: string[];
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  globalScale: number;
  setGlobalScale: (s: number) => void;
  settings?: AppSettings;
  onUpdateSettings?: (s: AppSettings) => void;
  data: AppData;
  onClearCategory: (categories: StudentCategory[]) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  setIsOpen,
  activeTab, 
  setActiveTab, 
  onLogout, 
  role,
  onSettingsOpen,
  filters,
  setFilters,
  uniqueTeachers,
  uniqueAssistants,
  uniqueLevels = [],
  settings,
  onUpdateSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFilter = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleTabSelect = (tab: Tab) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateSettings) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdateSettings({
          ...(settings || { fontSize: 12, fontFamily: "'Inter', sans-serif" }),
          backgroundImage: event.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBackground = () => {
    if (onUpdateSettings) {
      onUpdateSettings({
        ...(settings || { fontSize: 12, fontFamily: "'Inter', sans-serif" }),
        backgroundImage: undefined
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      ...filters,
      teacher: '',
      assistant: '',
      time: '',
      level: '',
      behavior: '',
      searchQuery: '',
      deadline: '',
      showHidden: false
    });
  };

  const navItems = [
    { id: Tab.HabitTracker, icon: Zap, label: 'Habit Tracker', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.Reflections, icon: LayoutGrid, label: 'Growth Plan', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.DailyJournal, icon: BookOpen, label: 'Daily Journal', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.Reminder, icon: Bell, label: 'Reminder Hub', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.DPSS, icon: FileText, label: 'DPSS & Note-taking', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.SelfLearning, icon: GraduationCap, label: 'Self-Learning', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.AIStudio, icon: Sparkles, label: 'AI Studio', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.ExpenseTracker, icon: Wallet, label: 'Daily Expenses', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.RecycleBin, icon: Trash2, label: 'Recycle Bin', roles: ['Admin', 'Teacher'] },
  ];

  const filterSelectStyle = "w-full bg-white/10 border border-white/20 rounded-xl py-2.5 px-3 text-[11px] text-slate-900 font-black outline-none transition-all cursor-pointer appearance-none hover:bg-white/20 focus:ring-4 focus:ring-primary-500/10 backdrop-blur-md";
  const labelStyle = "text-[10px] font-black text-slate-800 mb-2 flex items-center gap-2 ml-1 tracking-[3px]";

  return (
    <>
      {/* Re-open button when hidden */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-[60] w-12 h-12 bg-white text-[#1B254B] rounded-xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-slate-100"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={`fixed md:relative h-full z-50 md:z-40 bg-white/[0.02] backdrop-blur-md border-r border-white/10 text-slate-900 flex flex-col transition-all duration-300 ease-in-out overflow-hidden shadow-2xl no-print shrink-0 ${
          isOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 overflow-hidden'
        }`}
      >
        {/* Branding Area with Collapse Toggle */}
        <div className="p-6 flex items-center justify-between border-b border-white/5 h-20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg flex-shrink-0">
              P
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase leading-none text-slate-900">Peak Performance</h2>
              <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mt-1">Growth Portal</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-white/10 rounded-xl transition-all"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Undo/Redo Section */}
        <div className="px-5 py-3 border-b border-white/5 flex gap-2 shrink-0 bg-slate-50/10">
            <button 
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all ${canUndo ? 'bg-white/20 text-slate-900 hover:bg-white/30 border border-slate-200' : 'bg-white/5 text-slate-300 opacity-50 cursor-not-allowed border border-transparent'}`}
            >
                <RotateCcw size={14} /> Undo
            </button>
            <button 
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all ${canRedo ? 'bg-white/20 text-slate-900 hover:bg-white/30 border border-slate-200' : 'bg-white/5 text-slate-300 opacity-50 cursor-not-allowed border border-transparent'}`}
            >
                <RotateCw size={14} /> Redo
            </button>
        </div>

        {/* Navigation & Filters */}
        <div className="flex-1 px-5 py-6 space-y-8 overflow-y-auto custom-scrollbar">
          <nav className="space-y-2">
              {navItems.filter(item => item.roles.includes(role)).map(item => (
                <button
                    key={item.id}
                    onClick={() => handleTabSelect(item.id)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-[20px] transition-all w-full group ${
                      activeTab === item.id 
                        ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20 backdrop-blur-[4px]' 
                        : 'text-slate-600 hover:text-orange-600 hover:bg-white/[0.05]'
                    }`}
                >
                    <item.icon size={22} strokeWidth={activeTab === item.id ? 3 : 2} />
                    <span className="text-[11px] font-black tracking-widest">{item.label}</span>
                </button>
              ))}
          </nav>
        </div>

        {/* Footer Area */}
        <div className="p-4 bg-white/5 border-t border-white/5 space-y-2 no-print shrink-0 backdrop-blur-md">
          <div className="px-2 pb-2">
            <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-3">Customization</p>
            <div className="flex gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 border border-white/30 rounded-xl text-slate-900 hover:text-orange-600 hover:border-orange-400/50 transition-all text-[9px] font-black uppercase shadow-sm"
              >
                <ImageIcon size={14} /> Background
              </button>
              <input type="file" ref={fileInputRef} onChange={handleBackgroundUpload} className="hidden" accept="image/*" />
              {settings?.backgroundImage && (
                <button onClick={removeBackground} className="w-10 h-10 flex items-center justify-center bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          <button 
            onClick={onSettingsOpen}
            className="flex items-center gap-3 px-5 py-3 rounded-xl text-slate-900 hover:text-orange-600 hover:bg-white/20 transition-all w-full font-black uppercase tracking-widest text-[10px]"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
};
