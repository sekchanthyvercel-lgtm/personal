import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Calendar, AlignLeft, AlignCenter, AlignRight, Highlighter, MousePointer2, Minus, Layout, Square, Quote, Settings2, FileUp, Image as ImageIcon, Video, Music, FileText, Loader2, Wand2, Menu, ChevronLeft, GraduationCap, ChevronRight } from 'lucide-react';
import { AppData, DPSSTopic } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { callNeuralEngine } from '../services/neuralEngine';
import { AISelfLearningModal } from './AISelfLearningModal';

interface SelfLearningTableProps {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onOpenSidebar?: () => void;
}

export const SelfLearningTable: React.FC<SelfLearningTableProps> = ({ data, onUpdate, onOpenSidebar }) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState<{ x: number, y: number } | null>(null);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(window.innerWidth < 768 ? 200 : 300);
  const isResizing = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.max(150, Math.min(e.clientX - 10, 500));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  const savedRange = useRef<Range | null>(null);
  
  const colors = [
    { name: 'Yellow', value: '#fef3c7' },
    { name: 'Green', value: '#dcfce7' },
    { name: 'Blue', value: '#dbeafe' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Orange', value: '#ffedd5' },
    { name: 'Clear', value: 'transparent' }
  ];

  const fontFamilies = [
    { name: 'Modern', value: 'Inter' },
    { name: 'Display (DPSS)', value: 'Space Grotesk' },
    { name: 'Elegant', value: 'Playfair Display' },
    { name: 'Technical', value: 'JetBrains Mono' },
    { name: 'Handwritten', value: 'cursive' }
  ];
  
  const dpssSettings = data.settings || { fontSize: 12, fontFamily: "'Inter', sans-serif" };
  const textFontFamily = dpssSettings.textFontFamily || dpssSettings.fontFamily;
  const textFontSize = dpssSettings.textFontSize || dpssSettings.fontSize;

  const topics = (data.selfLearningTopics || []).map(t => ({
    ...t,
    content: typeof t.content === 'string' ? t.content : '',
    alignment: t.alignment || 'left',
    children: t.children || []
  }));

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        if (activeColor) {
           applyColor(activeColor, true);
           return;
        }
        savedRange.current = range.cloneRange();
        const rect = range.getBoundingClientRect();
        setPickerPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 50
        });
      }
    } else {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
           setPickerPos(null);
        }
      }, 100);
    }
  };

  const applyColor = (color: string, selectionProvided: boolean = false) => {
    const selection = window.getSelection();
    if (!selection) return;

    if (!selectionProvided) {
      if (!savedRange.current) return;
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    
    if (color === 'transparent') {
      document.execCommand('removeFormat', false, undefined);
    } else {
      document.execCommand('backColor', false, color);
    }
    
    if (!selectionProvided) {
      selection.removeAllRanges();
      savedRange.current = null;
      setPickerPos(null);
    }
  };

  const updateGlobalSettings = (updates: any) => {
    onUpdate({
      ...data,
      settings: { ...dpssSettings, ...updates }
    });
  };

  const findTopic = (items: DPSSTopic[], id: string): DPSSTopic | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findTopic(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const addTopic = (parentId?: string) => {
    const newTopic: DPSSTopic = { id: uuidv4(), title: 'New Topic', content: '', alignment: 'left' };
    const updateTopics = (items: DPSSTopic[]): DPSSTopic[] => {
      if (!parentId) return [...items, newTopic];
      return items.map(item => {
        if (item.id === parentId) return { ...item, children: [...(item.children || []), newTopic] };
        if (item.children) return { ...item, children: updateTopics(item.children) };
        return item;
      });
    };
    onUpdate({ ...data, selfLearningTopics: updateTopics(topics) });
  };

  const deleteTopic = (id: string) => {
    if (confirm('Are you sure you want to delete this topic?')) {
      const filterTopics = (items: DPSSTopic[]): DPSSTopic[] => {
        return items.filter(item => item.id !== id).map(item => ({
          ...item,
          children: item.children ? filterTopics(item.children) : undefined
        }));
      };
      onUpdate({ ...data, selfLearningTopics: filterTopics(topics) });
      setSelectedTopicId(null);
    }
  };

  const updateTopic = (id: string, updates: Partial<DPSSTopic>) => {
    const updateItems = (items: DPSSTopic[]): DPSSTopic[] => {
      return items.map(item => {
        if (item.id === id) return { ...item, ...updates };
        if (item.children) return { ...item, children: updateItems(item.children) };
        return item;
      });
    };
    onUpdate({ ...data, selfLearningTopics: updateItems(topics) });
  };

  const selectedTopic = selectedTopicId ? findTopic(topics, selectedTopicId) : null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedTopic) return;

    // Use a basic FileReader to generate data URL and insert it
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      let html = '';
      
      try {
        if (file.type.startsWith('image/')) {
            html = `<div style="margin: 15px 0; text-align: center;"><img src="${dataUrl}" alt="uploaded image" style="max-width: 100%; max-height: 400px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);" /></div><p><br></p>`;
        } else if (file.type.startsWith('video/')) {
            html = `<div contenteditable="false" style="margin: 15px 0; text-align: center;"><video controls src="${dataUrl}" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"></video></div><p><br></p>`;
        } else if (file.type.startsWith('audio/')) {
            html = `<div contenteditable="false" style="margin: 15px 0; text-align: center; background: rgba(255,255,255,0.4); padding: 15px; border-radius: 50px;"><audio controls src="${dataUrl}" style="width: 100%; outline: none;"></audio></div><p><br></p>`;
        } else {
            // General file link (PDF, MS Word)
            html = `<div contenteditable="false" style="margin: 15px 0; padding: 12px 16px; background: rgba(241, 245, 249, 0.8); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; display: inline-block;">
                <a href="${dataUrl}" download="${file.name}" target="_blank" rel="noopener noreferrer" style="color: #0ea5e9; font-weight: bold; text-decoration: none;">📎 Open/Download: ${file.name}</a>
            </div><p><br></p>`;
        }
        if (editorRef.current) {
          editorRef.current.focus();
          if (savedRange.current) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(savedRange.current);
          }
        }
        document.execCommand('insertHTML', false, html);
        if (editorRef.current) {
           updateTopic(selectedTopic.id, { content: editorRef.current.innerHTML });
        }
      } catch (err) {
        console.error("Storage / Quota error likely:", err);
        alert("File may be too large to save in local storage. Consider using Firebase.");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset
  };

  const insertDate = () => {
    if (!selectedTopic) return;
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedDate = `<div style="color: #10b981; font-weight: 800; font-size: 1.2em; border-left: 4px solid #10b981; padding-left: 12px; margin: 10px 0;">${dateStr}</div>`;
    updateTopic(selectedTopic.id, { content: formattedDate + selectedTopic.content });
  };

  const enhanceWithAI = async () => {
    if (!selectedTopic || isAILoading) return;
    setIsAILoading(true);
    try {
        const result = await callNeuralEngine(
            'gemini-3-flash-preview',
            `Enhance this note. Improve structure, fix grammar, and expand slightly if it helps clarity. Return HTML formatted string only. Current content: ${selectedTopic.content}`,
            "You are a helpful note-taking assistant. Output ONLY valid HTML."
        );
        let improved = result.text.trim();
        if (improved.startsWith('\`\`\`html')) improved = improved.slice(7);
        if (improved.endsWith('\`\`\`')) improved = improved.slice(0, -3);
        
        updateTopic(selectedTopic.id, { content: improved });
    } catch(e) {
        console.error(e);
        alert('Failed to enhance content with AI.');
    } finally {
        setIsAILoading(false);
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      e.preventDefault();
      const href = anchor.getAttribute('href');
      const download = anchor.getAttribute('download');
      
      if (href) {
        const link = document.createElement('a');
        link.href = href;
        if (download) link.download = download;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const renderTopic = (topic: DPSSTopic, depth = 0) => (
    <div key={topic.id} style={{ marginLeft: `${depth * 15}px` }}>
      <div 
        onClick={() => {
          setSelectedTopicId(topic.id);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }} 
        className={`p-2 my-1 rounded-lg cursor-pointer flex items-center justify-between ${selectedTopicId === topic.id ? 'bg-emerald-100/50' : 'bg-white/5 hover:bg-white/10'}`}
      >
        <span className="font-bold text-[13px] text-slate-700 truncate max-w-[180px]">{topic.title}</span>
        <div className='flex gap-1 shrink-0'>
            <button onClick={(e) => { e.stopPropagation(); addTopic(topic.id); }}><Plus size={14} className="text-slate-400 hover:text-green-500"/></button>
            <button onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id); }}><Trash2 size={14} className="text-slate-400 hover:text-red-500"/></button>
        </div>
      </div>
      {topic.children?.map(child => renderTopic(child, depth + 1))}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full md:h-[90vh] p-2 gap-0 overflow-hidden relative">
      {/* Sidebar Panel - Mobile Slide-in Overlay */}
      <div 
        style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
        className={`
          fixed md:relative inset-y-0 left-0 z-50 md:z-30
          bg-white/95 md:bg-white/10 backdrop-blur-3xl md:backdrop-blur-md 
          rounded-r-3xl md:rounded-3xl p-4 md:p-6 border-r md:border border-white/20 
          flex flex-col gap-4 overflow-hidden shrink-0 transition-[width,transform] duration-300 transform
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-xl font-black text-slate-800 tracking-tight whitespace-nowrap">Self-Learning</h2>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"
          >
            <ChevronLeft size={24} />
          </button>
        </div>

        <button 
          onClick={() => {
            addTopic();
          }} 
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-orange-500 text-white rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-orange-600 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all shrink-0 whitespace-nowrap"
        >
          <Plus size={18} /> Add New Topic
        </button>

        <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
            {topics.map(t => renderTopic(t))}
        </div>
      </div>

      {/* Resize Handle */}
      {isSidebarOpen && (
        <div 
          className="hidden md:block w-1 hover:w-2 bg-transparent hover:bg-emerald-500/20 cursor-col-resize z-40 transition-all shrink-0"
          onMouseDown={() => {
            isResizing.current = true;
            document.body.style.cursor = 'col-resize';
          }}
        />
      )}
      
      {/* Editor Area */}
      <div className={`flex-1 bg-white/10 backdrop-blur-md rounded-3xl p-4 md:p-6 border border-white/20 relative overflow-hidden flex flex-col ${!isSidebarOpen ? 'w-full' : 'hidden md:flex'}`}>
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute left-4 top-4 z-[100] p-3 bg-emerald-500 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center"
          >
            <Menu size={24} />
          </button>
        )}
        {selectedTopic ? (
            <div className="space-y-4 h-full flex flex-col">
                <div className="flex items-center gap-2 md:gap-4 px-2">
                  {!isSidebarOpen && <div className="w-12 md:hidden shrink-0" />} {/* Spacer for the absolute menu button */}
                  <input 
                      value={selectedTopic.title} 
                      onChange={(e) => updateTopic(selectedTopic.id, { title: e.target.value })}
                      className="flex-1 text-2xl md:text-4xl font-black text-slate-900 bg-transparent outline-none p-2 border-b-2 border-emerald-500/20 focus:border-emerald-500 transition-all font-sans"
                      placeholder="Topic Title..."
                  />
                </div>
                
                <div className='flex flex-wrap gap-2 p-2 border-b border-white/20 items-center sticky top-0 bg-white/30 backdrop-blur-xl z-20 rounded-xl overflow-x-auto no-scrollbar'>
                    <div className="flex gap-1 bg-white/40 p-1 rounded-lg shrink-0">
                      <button className="p-1.5 hover:bg-white rounded transition-colors" title="Align Left" onClick={() => updateTopic(selectedTopic.id, { alignment: 'left' })}><AlignLeft size={16} /></button>
                      <button className="p-1.5 hover:bg-white rounded transition-colors" title="Align Center" onClick={() => updateTopic(selectedTopic.id, { alignment: 'center' })}><AlignCenter size={16} /></button>
                      <button className="p-1.5 hover:bg-white rounded transition-colors" title="Align Right" onClick={() => updateTopic(selectedTopic.id, { alignment: 'right' })}><AlignRight size={16} /></button>
                    </div>

                    <div className="h-6 w-px bg-white/30 mx-1" />

                    <div className="flex gap-1 bg-white/40 p-1 rounded-lg">
                      <button 
                        className="p-1.5 hover:bg-white rounded transition-colors text-slate-700" 
                        title="Add Box"
                        onClick={() => {
                          const html = `<div style="border: 2px solid #e2e8f0; padding: 20px; border-radius: 16px; margin: 15px 0; background: rgba(255,255,255,0.3);">Box Content...</div><p><br></p>`;
                          document.execCommand('insertHTML', false, html);
                        }}
                      >
                        <Square size={16} />
                      </button>
                      
                      <button 
                        className="p-1.5 hover:bg-white rounded transition-colors text-slate-700" 
                        title="Add Callout Block"
                        onClick={() => {
                          const html = `<div style="background: rgba(248,250,252,0.8); border-left: 6px solid #10b981; padding: 16px; border-radius: 8px; margin: 15px 0; font-style: italic; color: #334155;">Learning Note...</div><p><br></p>`;
                          document.execCommand('insertHTML', false, html);
                        }}
                      >
                        <Quote size={16} />
                      </button>

                      <button 
                        className="p-1.5 hover:bg-white rounded transition-colors text-slate-700" 
                        title="Add Divider"
                        onClick={() => {
                          const html = `<hr style="border: none; border-top: 2px solid rgba(0,0,0,0.1); margin: 25px 0;"><p><br></p>`;
                          document.execCommand('insertHTML', false, html);
                        }}
                      >
                        <Minus size={16} />
                      </button>

                      <button 
                        className="p-1.5 hover:bg-white rounded transition-colors text-slate-700" 
                        title="Add 2-Column Grid"
                        onClick={() => {
                          const html = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;"><div style="border: 1px dashed rgba(0,0,0,0.1); padding: 15px; border-radius: 12px;">Point A</div><div style="border: 1px dashed rgba(0,0,0,0.1); padding: 15px; border-radius: 12px;">Point B</div></div><p><br></p>`;
                          document.execCommand('insertHTML', false, html);
                        }}
                      >
                        <Layout size={16} />
                      </button>
                    </div>

                    <div className="h-6 w-px bg-white/30 mx-1" />

                    <div className="flex items-center gap-2 bg-white/40 p-1 px-3 rounded-lg border border-white/40 transition-all">
                      <Highlighter size={14} className={activeColor ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
                      <div className="flex gap-1.5">
                        {colors.map(c => (
                          <button
                            key={c.value}
                            onClick={() => setActiveColor(activeColor === c.value ? null : c.value)}
                            className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 shadow-sm ${activeColor === c.value ? 'border-emerald-500 scale-125' : 'border-white/40'}`}
                            style={{ backgroundColor: c.value === 'transparent' ? '#f8fafc' : c.value }}
                            title={c.name}
                          >
                            {c.value === 'transparent' && <span className="text-[8px] font-black opacity-30">✕</span>}
                          </button>
                        ))}
                      </div>
                      {activeColor && (
                        <button onClick={() => setActiveColor(null)} className="ml-1 text-[9px] font-black bg-white/60 hover:bg-white px-1.5 rounded uppercase tracking-tighter text-slate-500">
                          Stop
                        </button>
                      )}
                    </div>

                    <div className="h-6 w-px bg-white/30 mx-1" />
                    
                    <div className="flex gap-1 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/30 transition-all">
                      <label 
                        className="p-1 hover:bg-white/50 rounded flex items-center justify-center gap-2 cursor-pointer text-blue-700 font-bold text-xs" 
                        title="Upload File / Media (PDF, Images, MP3, MP4, Docs)"
                      >
                        <FileUp size={16} className="text-blue-600" />
                        <span>Upload File</span>
                        <input 
                          type="file" 
                          accept=".pdf,.doc,.docx,.xls,.xlsx,image/*,audio/*,video/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <button 
                          onClick={() => setShowAIModal(true)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-200 shadow-sm transition-colors"
                        >
                          <Wand2 size={14} /> AI Tutor
                        </button>
                        <button onClick={enhanceWithAI} disabled={isAILoading} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 shadow-sm transition-colors disabled:opacity-50">
                          {isAILoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                          AI Enhance
                        </button>
                        <button onClick={insertDate} className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-orange-500 text-white rounded-lg text-xs font-bold hover:from-emerald-600 hover:to-orange-600 shadow-sm transition-colors">
                          <Calendar size={14} /> Insert Date
                        </button>
                    </div>
                </div>

                {pickerPos && (
                  <div 
                    className="fixed z-50 bg-white/90 backdrop-blur p-2 rounded-2xl shadow-2xl border border-white flex gap-2"
                    style={{ left: pickerPos.x, top: pickerPos.y, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {colors.map(color => (
                        <button 
                            key={color.value}
                            className={`w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform ${color.value === 'transparent' ? 'bg-slate-100 flex items-center justify-center' : ''}`}
                            style={{ backgroundColor: color.value }}
                            onClick={() => applyColor(color.value)}
                            title={color.name}
                        >
                          {color.value === 'transparent' && <span className="text-[8px] font-black opacity-40">✕</span>}
                        </button>
                    ))}
                  </div>
                )}

                <div 
                    ref={editorRef}
                    contentEditable={true}
                    onClick={handleEditorClick}
                    onMouseUp={handleSelection}
                    onKeyUp={handleSelection}
                    onBlur={(e) => {
                      updateTopic(selectedTopic.id, { content: e.currentTarget.innerHTML });
                    }}
                    dangerouslySetInnerHTML={{ __html: selectedTopic.content }}
                    style={{ 
                      textAlign: selectedTopic.alignment, 
                      minHeight: '300px',
                      fontSize: `${textFontSize}px`,
                      fontFamily: textFontFamily
                    }}
                    className="w-full flex-1 bg-white/5 outline-none p-8 rounded-3xl text-slate-800 leading-relaxed font-medium transition-all focus:bg-white/20"
                />
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-slate-400 p-8 text-center bg-white/5 backdrop-blur-sm rounded-[40px] m-4">
                <div className="w-24 h-24 bg-white/40 backdrop-blur-md rounded-[32px] border border-white/60 flex items-center justify-center animate-pulse shadow-xl shadow-slate-200/50">
                    <GraduationCap size={40} className="text-slate-300" />
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-black uppercase tracking-[3px] text-slate-500">Curriculum Empty</p>
                    <p className="text-[10px] font-bold text-slate-400 max-w-[240px] leading-relaxed uppercase mx-auto">Select a learning module from the side catalog to begin your mastery advancement</p>
                </div>
                <button 
                  onClick={onOpenSidebar}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[3px] shadow-2xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all md:hidden animate-bounce"
                >
                  Open Learning Catalog
                </button>
            </div>
        )}
      </div>
      <AISelfLearningModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} topic={selectedTopic || undefined} />
    </div>
  );
};

export default SelfLearningTable;
