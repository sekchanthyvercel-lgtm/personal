
// Shared types for the application

export type StudyType = 'FullTime' | 'PartTime' | 'Khmer';

export type StudentCategory = 'Hall' | 'Class' | 'Office' | 'Card' | 'Queue' | 'Penalty' | 'DailyTask' | 'Reminder';

export type UserRole = 'Admin' | 'Teacher' | 'Finance';

export interface ColumnConfig {
  id: string;
  key: string;
  label: string;
  width: number;
  visible: boolean;
  type: 'text' | 'date' | 'boolean' | 'select';
}

export interface CurrentUser {
  name: string;
  role: UserRole;
  uid?: string;
}

export interface PhotoAdjust {
  x: number;
  y: number;
  scale: number;
}

export interface Student {
  id: string;
  name: string;
  category: StudentCategory;
  order: number;
  isHidden?: boolean;
  deletedAt?: string;
  parentContact?: boolean;
  headTeacher?: boolean;
  photo?: string;
  photoAdjust?: PhotoAdjust;
  thumbprintNotes?: string;
  [key: string]: any; // Support for dynamic columns
}

export interface AppSettings {
  fontSize: number;
  fontFamily: string;
  columns?: ColumnConfig[];
  backgroundImage?: string;
  currency?: 'USD' | 'KHR';
  exchangeRate?: number;
  fontColor?: string;
}

export interface ModuleLocks {
  Hall: boolean;
  Attendance: boolean;
  Finance: boolean;
}

export type NeuralEngine = string;
export interface QuickSource { data: string; mimeType: string; }
export interface OutlineItem { id: string; title: string; expanded: boolean; children: OutlineItem[]; }
export type ExternalKeys = Record<string, string>;

/**
 * Interface for staff contact information (phone and telegram).
 */
export interface StaffDirectory {
  [name: string]: {
    phone?: string;
    telegram?: string;
  };
}

/**
 * Interface representing a single chat message in AI Studio.
 */
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

/**
 * Interface representing a saved chat session in AI Studio.
 */
export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'table' | 'image' | 'file' | 'date';
  data: any;
}

export interface DPSSTopic {
  id: string;
  title: string;
  content: string;
  alignment: 'left' | 'center' | 'right';
  children?: DPSSTopic[];
  attachments?: { id: string; name: string; url: string; type: string }[];
}

export interface Habit {
  id: string;
  name: string;
  color?: string;
  order: number;
}

export interface HabitCompletion {
  [habitId: string]: boolean;
}

export interface AppData {
  students: Student[];
  settings?: AppSettings;
  attendance: Record<string, Record<string, number>>;
  dailyTasks?: Record<string, Record<string, string>>;
  dpssTopics?: DPSSTopic[];
  systemLocked?: boolean;
  moduleLocks?: ModuleLocks;
  idCounters?: Record<string, number>;
  schoolLogo?: string;
  staffDirectory?: StaffDirectory;
  habits?: Habit[];
  habitCompletions?: Record<string, HabitCompletion>; // key: YYYY-MM-DD
  journalEntries?: Record<string, JournalEntry>; // key: YYYY-MM-DD
  reflections?: ReflectionData;
  expenses?: ExpenseEntry[];
  expenseCategories?: string[];
  selfLearningTopics?: DPSSTopic[];
}

export interface ExpenseEntry {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'Income' | 'Expense';
  currency?: 'USD' | 'KHR';
  notes?: string;
}

export interface ReflectionEntry {
  id: string;
  title: string;
  content: string;
  archivedAt?: string; // If present, it's archived
}

export interface ReflectionData {
  weeklyReview: ReflectionEntry;
  monthlyChallenge: ReflectionEntry;
  threeMonthVision: ReflectionEntry;
  sixMonthVision: ReflectionEntry;
  oneYearVision: ReflectionEntry;
  archives?: ReflectionEntry[];
}

export interface JournalEntry {
  achievements: string[];
  affirmation: string;
  gratitude: string;
  feeling: string;
  appreciation: string;
  lookingForward: string;
  inspiration: string;
  learning: string;
  discipline: string;
  isCompleted: boolean;
}

export interface BackupEntry {
  id: string;
  timestamp: string;
  data: AppData;
  type: 'Auto' | 'Manual';
}

export enum Tab {
  HabitTracker = 'HabitTracker',
  DailyTask = 'DailyTask',
  Reflections = 'Reflections',
  DailyJournal = 'DailyJournal',
  Reminder = 'Reminder',
  DPSS = 'DPSS',
  SelfLearning = 'SelfLearning',
  AIStudio = 'AIStudio',
  ExpenseTracker = 'ExpenseTracker',
  RecycleBin = 'RecycleBin'
}

export type ViewMode = 'Default' | 'Minimalist';

export interface FilterState {
  searchQuery: string; 
  teacher: string;
  assistant: string;
  time: string;
  level: string;
  behavior: string;
  deadline: string;
  showHidden: boolean;
}
