import React, { useState } from 'react';
import { AppSettings, CurrentUser } from '../types';
import { X, Save, Settings2, Type, Baseline, Paintbrush, Check, Cloud, LogIn, LogOut } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings?: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  currentUser?: CurrentUser | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

const fontFamilies = [
  { name: 'System Default', value: 'ui-sans-serif, system-ui, -apple-system, sans-serif' },
  { name: 'Modern', value: '"Inter", sans-serif' },
  { name: 'Technical', value: '"JetBrains Mono", monospace' },
  { name: 'Elegant Serif', value: '"Playfair Display", serif' },
  { name: 'Playful', value: '"Comic Neue", "Comic Sans MS", cursive, sans-serif' },
  { name: 'Handwriting', value: '"Caveat", "Dancing Script", cursive' }
];

const colors = [
  { name: 'Default Dark', value: '#0f172a' },
  { name: 'Slate', value: '#334155' },
  { name: 'Midnight Blue', value: '#1e3a8a' },
  { name: 'Emerald', value: '#047857' },
  { name: 'Rose', value: '#be123c' },
  { name: 'Amber', value: '#b45309' },
];

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onUpdate, currentUser, onLogin, onLogout }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>({
    fontFamily: settings?.fontFamily || 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontSize: settings?.fontSize || 16,
    fontColor: settings?.fontColor || '#0f172a',
    currency: settings?.currency || 'USD',
    exchangeRate: settings?.exchangeRate || 4000,
  });

  const handleSave = () => {
    onUpdate({ ...settings, ...localSettings });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 z-[60] flex items-center justify-center backdrop-blur-md">
      <div className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/20 flex justify-between items-center bg-slate-900/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-xl text-white">
                 <Settings2 size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Global Settings</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-slate-500">
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">

            {/* Cloud Sync */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Cloud size={18} className="text-orange-500" />
                    <h3 className="tracking-wide">Cloud Sync</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl space-y-4 shadow-sm flex flex-col items-center text-center">
                    {currentUser?.uid ? (
                        <>
                          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                            <Check size={24} strokeWidth={3} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 mb-1">Synced & Backed Up</p>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                              Your data is automatically syncing with {currentUser.name}'s Google Account across all devices.
                            </p>
                            <button 
                              onClick={onLogout}
                              className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 hover:text-red-500 transition-colors font-bold text-xs flex items-center gap-2 mx-auto"
                            >
                              <LogOut size={14} /> Google Sign Out
                            </button>
                          </div>
                        </>
                    ) : (
                        <>
                          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2">
                            <Cloud size={24} strokeWidth={2} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 mb-1">Local Mode</p>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                              Your data is only stored in this browser. To access across devices and get 5GB cloud storage, please sign in.
                            </p>
                            <button 
                              onClick={onLogin}
                              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all font-black uppercase text-xs tracking-widest flex items-center gap-2 mx-auto"
                            >
                              <LogIn size={16} /> Google Sign In
                            </button>
                          </div>
                        </>
                    )}
                </div>
            </div>
            
            {/* Font settings */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Baseline size={18} className="text-orange-500" />
                    <h3 className="tracking-wide">Typography</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Font Family</label>
                        <select 
                            value={localSettings.fontFamily}
                            onChange={(e) => setLocalSettings(prev => ({...prev, fontFamily: e.target.value}))}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-slate-700"
                        >
                            {fontFamilies.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center pl-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Base Size</label>
                            <span className="text-xs font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">{localSettings.fontSize}px</span>
                        </div>
                        <input 
                            type="range" min="12" max="24" 
                            value={localSettings.fontSize} 
                            onChange={(e) => setLocalSettings(prev => ({...prev, fontSize: parseInt(e.target.value)}))}
                            className="w-full accent-orange-500 cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Colors */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Paintbrush size={18} className="text-orange-500" />
                    <h3 className="tracking-wide">Theme Color</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">Base Text Color</p>
                    <div className="flex flex-wrap gap-3">
                        {colors.map(c => (
                            <button
                                key={c.value}
                                onClick={() => setLocalSettings(prev => ({...prev, fontColor: c.value}))}
                                className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 shadow-sm flex items-center justify-center ${localSettings.fontColor === c.value ? 'border-orange-500 scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                            >
                                {localSettings.fontColor === c.value && <Check size={16} className="text-white mix-blend-overlay" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Financial settings could go here as well if needed: currency/rate */}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/20 bg-slate-900/5">
            <button 
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-black text-sm tracking-wide shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5"
            >
                <Save size={18} /> Apply Changes
            </button>
        </div>

      </div>
    </div>
  );
};
