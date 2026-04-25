import React, { useState, useEffect, useMemo } from 'react';
import { HabitTracker } from './components/HabitTracker';
import { DailyJournal } from './components/DailyJournal';
import { Reflections } from './components/Reflections';
import { ExpenseTracker } from './components/ExpenseTracker';
import ReminderTable from './components/ReminderTable';
import { AIStudio } from './components/AIStudio';
import { LandingPage } from './components/LandingPage';
import { AIModal } from './components/AIModal';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { SupermanAnimation } from './components/SupermanAnimation';
import DPSSTable from './components/DPSSTable';
import SelfLearningTable from './components/SelfLearningTable';
import { DailyTaskTable } from './components/DailyTaskTable';
import { RecycleBin } from './components/RecycleBin';
import { AppData, Student, CurrentUser, UserRole, ColumnConfig, Tab, ViewMode, AppSettings, StudentCategory } from './types';
import { subscribeToData, saveData } from './services/firebase';
import { Menu, MessageSquare, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format } from 'date-fns';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'c2', key: 'teachers', label: 'TEACHERS', width: 180, visible: true, type: 'text' },
  { id: 'c3', key: 'level', label: 'LEVEL', width: 85, visible: true, type: 'text' },
  { id: 'c5', key: 'behavior', label: 'BEHAVIOR', width: 180, visible: true, type: 'text' },
  { id: 'c_schedule', key: 'schedule', label: 'SCHEDULE', width: 140, visible: true, type: 'text' },
  { id: 'c4', key: 'time', label: 'TIME', width: 110, visible: true, type: 'text' },
  { id: 'c6', key: 'duration', label: 'DURATION', width: 100, visible: true, type: 'text' },
  { id: 'c7', key: 'startDate', label: 'START', width: 100, visible: true, type: 'text' },
  { id: 'c8', key: 'deadline', label: 'DEADLINE', width: 100, visible: true, type: 'text' },
  { id: 'c9', key: 'assistant', label: 'ASSISTANT', width: 150, visible: true, type: 'text' }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const stored = localStorage.getItem('dps_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    let unsubscribeAuth: any = () => {};
    import('./services/firebase').then(({ auth }) => {
      unsubscribeAuth = auth.onAuthStateChanged((user) => {
        if (user) {
          const role = (localStorage.getItem('dps_user') ? JSON.parse(localStorage.getItem('dps_user')!).role : 'Teacher') || 'Teacher';
          const newUser: CurrentUser = { name: user.displayName || 'User', role, uid: user.uid };
          setCurrentUser(newUser);
          localStorage.setItem('dps_user', JSON.stringify(newUser));
        } else {
          setCurrentUser(null);
          localStorage.removeItem('dps_user');
        }
      });
    });
    return () => unsubscribeAuth();
  }, []);

  const [data, setData] = useState<AppData>({ 
    students: [], 
    settings: { 
      fontSize: 12, 
      fontFamily: "'Inter', sans-serif", 
      columns: DEFAULT_COLUMNS,
      backgroundImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000'
    },
    attendance: {}
  });

  const [history, setHistory] = useState<AppData[]>([]);
  const [redoStack, setRedoStack] = useState<AppData[]>([]);

  const [activeTab, setActiveTab] = useState<Tab>(Tab.HabitTracker);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('Default');
  const [globalScale, setGlobalScale] = useState(1);
  
  const [filters, setFilters] = useState<any>({
    searchQuery: '', 
    teacher: '', 
    assistant: '',
    time: '', 
    level: '', 
    behavior: '', 
    deadline: '', 
    showHidden: false,
    attendanceTab: 'PartTime',
    attendanceClass: ''
  });

  const OFFICIAL_DAILY_TASKS = useMemo(() => [
    { name: "Souyean & Sreythea", level: "1A + (5.1)", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Sreythea & Vilya", level: "1A + (5.1)", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Chhenglay & Nita", level: "1B-(16.10)", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Chhenglay & Derith", level: "1B-", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Meymey & Naza", level: "1B- (1.9)", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Naza & Pulvatey", level: "1B-", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Mengthou & Meymey", level: "Pre-2A(I)-", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Chanpanha & Sonita", level: "Pre-2A(I)-", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Derith & Mengthou", level: "Pre-2A(I)+", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Lina & Davina", level: "Pre-2A(I)+", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Pha & Saravottey", level: "Pre-2A(II)-", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Virak & Chhenglay", level: "Pre-2A(II)-", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Sreypov & Chhorvornn", level: "2A-", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Pha & Liza", level: "2A-", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Sreyleap & Chhengly", level: "2B-", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Chhorvornn & Sreyren", level: "2B-", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "S.Vottey & Soklim", level: "2B+", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Davina & Virak", level: "2B+", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Piseth & Kimheang", level: "3A-", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Nita & Thida", level: "3A-", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Sathyaboth & Thida", level: "3A-", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Chhengly & Pisey", level: "3A+", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Chhengly & Naza", level: "3A+", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Souyean & Soklim", level: "3B +", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Soklim & Chanpanha", level: "3B +", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Lina & Bormey", level: "4A-", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Sreyren & Both", level: "4A-", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Pisey & Chhenglay", level: "4A+", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Sonita & Chhorvornn", level: "4A+", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Virak & Socheata", level: "4A+", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Derith & Socheata", level: "4A+", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Bormey & Chomnan", level: "4B+", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Socheata & Dalin", level: "4B+", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Seavninh & Derith", level: "5A-", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Dalin & Piseth", level: "5A-", shift: "Afternoon", category: "DailyTask" as StudentCategory },
    { name: "Thida & Sreypov", level: "5B-", shift: "Morning", category: "DailyTask" as StudentCategory },
    { name: "Pulvatey & Pha", level: "5B-", shift: "Afternoon", category: "DailyTask" as StudentCategory }
  ], []);

  // One-time seed for Daily Tasks
  useEffect(() => {
    if (!loading) {
        const hasTasks = data.students.some(s => s.category === 'DailyTask');
        if (!hasTasks) {
            const newTasks: Student[] = OFFICIAL_DAILY_TASKS.map(t => ({
                ...t,
                id: uuidv4(),
                teachers: '',
                behavior: '',
                time: '',
                duration: '',
                startDate: '',
                deadline: format(new Date(), 'dd/MM/yy'),
                assistant: '',
                order: 0,
                isHidden: false
            }));
            handleUpdate({ ...data, students: [...data.students, ...newTasks] });
        }
    }
  }, [loading, data.students.length === 0]);

  const activeStudents = useMemo(() => data.students.filter(s => !s.deletedAt), [data.students]);

  const uniqueTeachers = useMemo(() => {
    const ts = new Set<string>();
    // From students
    activeStudents.forEach(s => {
      if (s.teachers) String(s.teachers).split('&').forEach(t => ts.add(t.trim()));
    });
    // From staff directory (all can be teachers/assistants)
    if (data.staffDirectory) {
      Object.keys(data.staffDirectory).forEach(name => ts.add(name.trim()));
    }
    return Array.from(ts).filter(Boolean).sort();
  }, [data.students, data.staffDirectory]);

  const uniqueAssistants = useMemo(() => {
    const asst = new Set<string>();
    // From students
    activeStudents.forEach(s => {
      if (s.assistant) String(s.assistant).split('&').forEach(a => asst.add(a.trim()));
    });
    // From staff directory
    if (data.staffDirectory) {
      Object.keys(data.staffDirectory).forEach(name => asst.add(name.trim()));
    }
    return Array.from(asst).filter(Boolean).sort();
  }, [data.students, data.staffDirectory]);

  const uniqueTimes = useMemo(() => {
    const tm = new Set<string>();
    activeStudents.forEach(s => {
      if (s.time) String(s.time).split('&').forEach(t => tm.add(t.trim()));
    });
    return Array.from(tm).filter(Boolean).sort();
  }, [data.students]);

  const uniqueLevels = useMemo(() => {
    const lv = new Set<string>();
    activeStudents.forEach(s => {
      if (s.level) String(s.level).split('&').forEach(l => lv.add(l.trim()));
    });
    return Array.from(lv).filter(Boolean).sort();
  }, [data.students]);

  const uniqueBehaviors = useMemo(() => {
    const bh = new Set<string>();
    activeStudents.forEach(s => s.behavior && bh.add(String(s.behavior).trim()));
    return Array.from(bh).filter(Boolean).sort();
  }, [activeStudents]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = subscribeToData(currentUser.uid, (newData) => {
      // Ensure DEFAULT_COLUMNS are initialized
      if (!newData.settings?.columns) {
          newData.settings = { ...(newData.settings || { fontSize: 12, fontFamily: "'Inter', sans-serif" }), columns: DEFAULT_COLUMNS };
      } else {
        // Migration: Remove redundant 'name' column if it exists in settings
        const hasNameCol = newData.settings.columns.some((c: any) => c.key === 'name');
        if (hasNameCol) {
          newData.settings.columns = newData.settings.columns.filter((c: any) => c.key !== 'name');
        }

        // Migration: Ensure 'schedule' column exists if missing
        const hasSchedule = newData.settings.columns.some((c: any) => c.key === 'schedule');
        if (!hasSchedule) {
          const newCols = [...newData.settings.columns];
          // Try to insert after behavior or before time
          const behaviorIdx = newCols.findIndex((c: any) => c.key === 'behavior');
          if (behaviorIdx !== -1) {
            newCols.splice(behaviorIdx + 1, 0, DEFAULT_COLUMNS.find(c => c.key === 'schedule')!);
          } else {
            newCols.push(DEFAULT_COLUMNS.find(c => c.key === 'schedule')!);
          }
          newData.settings.columns = newCols;
        }
      }
      setData(newData);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [currentUser]);

  const handleUpdate = (newData: AppData, skipHistory = false) => {
      if (!skipHistory) {
        setHistory(prev => [...prev.slice(-19), data]); // Keep last 20 states
        setRedoStack([]);
      }
      setData(newData);
      if (currentUser?.uid) saveData(currentUser.uid, newData);
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [...prev, data]);
    setHistory(prev => prev.slice(0, -1));
    setData(previous);
    if (currentUser?.uid) saveData(currentUser.uid, previous);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, data]);
    setRedoStack(prev => prev.slice(0, -1));
    setData(next);
    if (currentUser?.uid) saveData(currentUser.uid, next);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, redoStack, data]);

  const handleAddStudent = (parsedData?: Partial<Student> | Partial<Student>[]) => {
    const incomingData = Array.isArray(parsedData) ? parsedData : (parsedData ? [parsedData] : [{}]);
    const newStudents = incomingData.map((s, index) => {
        const today = new Date();
        
        let determinedCategory: StudentCategory = 'DailyTask';
        
        return {
          id: uuidv4(),
          name: '',
          category: determinedCategory,
          order: data.students.length + index,
          isHidden: false,
          parentContact: false,
          headTeacher: false,
          startDate: s.startDate || format(today, 'dd/MM/yyyy'),
          deadline: s.deadline || format(addMonths(today, 1), 'dd/MM/yyyy'),
          ...s
        } as Student;
    });
    handleUpdate({ ...data, students: [...newStudents, ...data.students] });
  };

  const handleLogin = async (_name: string, role: UserRole, _pin: string) => {
    try {
      const { signInWithGoogle } = await import('./services/firebase');
      const result = await signInWithGoogle();
      const user: CurrentUser = { name: result?.displayName || 'User', role, uid: result?.uid };
      setCurrentUser(user);
      localStorage.setItem('dps_user', JSON.stringify(user));
    } catch (error) {
      console.error(error);
      alert("Google Sign-In is required to access the secure database.");
    }
  };

  const handleLogout = async () => {
    try {
      const { logOut } = await import('./services/firebase');
      await logOut();
    } catch(e) {}
    setCurrentUser(null);
    localStorage.removeItem('dps_user');
  };

  const handleClearCategory = (categories: StudentCategory[]) => {
    if (!window.confirm(`Are you sure you want to move ALL students in ${categories.join('/')} to the Recycle Bin?`)) return;
    const now = new Date().toISOString();
    const updatedStudents = data.students.map(s => 
      categories.includes(s.category) ? { ...s, deletedAt: now } : s
    );
    handleUpdate({ ...data, students: updatedStudents });
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm('Move to Recycle Bin?')) {
      const now = new Date().toISOString();
      const updatedStudents = data.students.map(s => 
        s.id === id ? { ...s, deletedAt: now } : s
      );
      handleUpdate({ ...data, students: updatedStudents });
    }
  };

  // Automatically purge items older than 30 days
  useEffect(() => {
    if (!loading && data.students.length > 0) {
      const now = new Date();
      const filtered = data.students.filter(s => {
        if (!s.deletedAt) return true;
        const deletedDate = new Date(s.deletedAt);
        const diffDays = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays < 30;
      });
      
      if (filtered.length !== data.students.length) {
        handleUpdate({ ...data, students: filtered });
      }
    }
  }, [loading, data.students.length]);

  if (!currentUser?.uid) return <LandingPage onLogin={handleLogin} />;

  const isModuleLocked = (module: 'Hall' | 'Attendance' | 'Finance') => {
    return data.moduleLocks?.[module] || false;
  };

  return (
    <div 
      className="h-screen bg-cover bg-center bg-no-repeat flex font-sans overflow-hidden transition-all duration-700 bg-transparent" 
      style={{ 
        fontFamily: data.settings?.fontFamily || "'Inter', sans-serif",
        backgroundImage: data.settings?.backgroundImage ? `url(${data.settings.backgroundImage})` : 'none',
        color: data.settings?.fontColor || 'inherit'
      }}
    >
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        role={currentUser.role} 
        onSettingsOpen={() => setIsContactsOpen(true)}
        filters={filters}
        setFilters={setFilters}
        uniqueTeachers={uniqueTeachers}
        uniqueAssistants={uniqueAssistants}
        uniqueTimes={uniqueTimes}
        uniqueLevels={uniqueLevels}
        uniqueBehaviors={uniqueBehaviors}
        viewMode={viewMode}
        setViewMode={setViewMode}
        globalScale={globalScale}
        setGlobalScale={setGlobalScale}
        settings={data.settings}
        onUpdateSettings={(s) => handleUpdate({...data, settings: s})}
        data={data}
        onClearCategory={handleClearCategory}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={undo}
        onRedo={redo}
      />
      
      <AIModal 
        isOpen={isAiOpen} 
        onClose={() => setIsAiOpen(false)} 
        onAdd={handleAddStudent} 
        mode={
            activeTab === Tab.DailyTask ? 'DailyTask' : 'Hall'
        } 
      />
      
      <SettingsModal 
        isOpen={isContactsOpen} 
        onClose={() => setIsContactsOpen(false)} 
        settings={data.settings} 
        onUpdate={(newSettings) => handleUpdate({...data, settings: newSettings})} 
      />

      <SupermanAnimation students={data.students} />

      <main 
        className="flex-1 flex flex-col overflow-hidden transition-transform duration-300 origin-top-left bg-white/[0.01] backdrop-blur-md"
        style={{ transform: `scale(${globalScale})`, width: `${100/globalScale}%`, height: `${100/globalScale}%` }}
      >
        <div className="flex-1 overflow-hidden">
          <>
            {activeTab === Tab.HabitTracker && (
              <HabitTracker data={data} onUpdate={handleUpdate} />
            )}
            {activeTab === Tab.Reflections && (
              <Reflections data={data} onUpdate={handleUpdate} />
            )}
            {activeTab === Tab.DailyJournal && (
              <DailyJournal data={data} onUpdate={handleUpdate} />
            )}
            {activeTab === Tab.Reminder && (
              <ReminderTable 
                students={data.students}
                onAddStudent={(defaults) => handleAddStudent(defaults)}
                onUpdateStudent={(id, updates) => {
                  const updatedStudents = data.students.map(s => s.id === id ? { ...s, ...updates } : s);
                  handleUpdate({ ...data, students: updatedStudents });
                }}
                onDeleteStudent={handleDeleteStudent}
                onClearCategory={(cats) => handleClearCategory(cats as StudentCategory[])}
                filters={filters}
                setFilters={setFilters}
                role={currentUser.role}
                settings={data.settings}
                onUpdateSettings={(s) => handleUpdate({...data, settings: s})}
              />
            )}
            {activeTab === Tab.DailyTask && (
              <DailyTaskTable 
                students={activeStudents} 
                data={data}
                onUpdate={handleUpdate} 
                filters={filters} 
                setFilters={setFilters}
                onAddStudent={(defaults) => handleAddStudent(defaults)} 
                role={currentUser.role}
                onClearCategory={handleClearCategory}
              />
            )}
            {activeTab === Tab.DPSS && (
                <DPSSTable data={data} onUpdate={handleUpdate} />
            )}
            {activeTab === Tab.SelfLearning && (
                <SelfLearningTable data={data} onUpdate={handleUpdate} />
            )}
            {activeTab === Tab.AIStudio && (
                <AIStudio />
            )}
            {activeTab === Tab.ExpenseTracker && (
              <ExpenseTracker data={data} onUpdate={handleUpdate} />
            )}
            {activeTab === Tab.RecycleBin && (
              <RecycleBin data={data} onUpdate={handleUpdate} />
            )}
          </>
        </div>
      </main>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3 no-print z-50">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-14 h-14 bg-white text-slate-400 rounded-full shadow-2xl flex items-center justify-center hover:text-primary-500 hover:scale-110 active:scale-95 transition-all border-2 border-slate-100">
            <Menu size={24} />
          </button>
      </div>
    </div>
  );
};

export default App;