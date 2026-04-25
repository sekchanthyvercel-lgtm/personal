import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Calendar, AlignLeft, AlignCenter, AlignRight, Highlighter, Type, Settings2, MousePointer2, Minus, Layout, Square, Quote, FileUp, Loader2, Wand2 } from 'lucide-react';
import { AppData, DPSSTopic } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { callNeuralEngine } from '../services/neuralEngine';

interface DPSSTableProps {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

const DPSSTable: React.FC<DPSSTableProps> = ({ data, onUpdate }) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState<{ x: number, y: number } | null>(null);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
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
  
  const dpssSettings = data.settings || { fontSize: 18, fontFamily: 'Inter' };

  const topics = (data.dpssTopics || []).map(t => ({
    ...t,
    content: typeof t.content === 'string' ? t.content : '',
    alignment: t.alignment || 'left',
    children: t.children || []
  }));

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      
      // Ensure the selection is within our editor
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        // AUTO-APPLY if a color is picked first from toolbar
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
      // Don't clear immediately if we're clicking the picker
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
    
    // Cleanup
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
    onUpdate({ ...data, dpssTopics: updateTopics(topics) });
  };

  const deleteTopic = (id: string) => {
    if (confirm('Are you sure you want to delete this topic?')) {
      const filterTopics = (items: DPSSTopic[]): DPSSTopic[] => {
        return items.filter(item => item.id !== id).map(item => ({
          ...item,
          children: item.children ? filterTopics(item.children) : undefined
        }));
      };
      onUpdate({ ...data, dpssTopics: filterTopics(topics) });
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
    onUpdate({ ...data, dpssTopics: updateItems(topics) });
  };

  const selectedTopic = selectedTopicId ? findTopic(topics, selectedTopicId) : null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedTopic) return;

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
            html = `<div contenteditable="false" style="margin: 15px 0; padding: 12px 16px; background: rgba(255, 237, 213, 0.8); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; display: inline-block;">
                <a href="${dataUrl}" download="${file.name}" target="_blank" rel="noopener noreferrer" style="color: #f97316; font-weight: bold; text-decoration: none;">📎 Open/Download: ${file.name}</a>
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
        console.error("Storage error:", err);
        alert("File may be too large to save in local storage. Consider using Firebase.");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset
  };

  const insertDate = () => {
    if (!selectedTopic) return;
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedDate = `<div style="color: #f59e0b; font-weight: 800; font-size: 1.2em; border-left: 4px solid #f59e0b; padding-left: 12px; margin: 10px 0;">${dateStr}</div>`;
    updateTopic(selectedTopic.id, { content: formattedDate + selectedTopic.content });
  };

  const enhanceWithAI = async () => {
    if (!selectedTopic || isAILoading) return;
    setIsAILoading(true);
    try {
        const result = await callNeuralEngine(
            'gemini-3-pro-preview',
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
      <div onClick={() => setSelectedTopicId(topic.id)} className={`p-2 my-1 rounded-lg cursor-pointer flex items-center justify-between ${selectedTopicId === topic.id ? 'bg-orange-100/50' : 'bg-white/5 hover:bg-white/10'}`}>
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
    <div className="flex h-[90vh] p-2 gap-2">
      {/* Sidebar with Fonts */}
      <div className="w-[300px] bg-white/10 backdrop-blur-md rounded-3xl p-4 border border-white/20 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">DPSS & Note-taking</h2>
        </div>

        <button onClick={() => addTopic()} className="w-full py-3 bg-orange-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all">
          <Plus size={16} /> Add New Topic
        </button>

        <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
            {topics.map(t => renderTopic(t))}
        </div>
      </div>
      
      {/* Editor Area */}
      <div className="flex-1 bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 relative overflow-hidden flex flex-col">
        {selectedTopic ? (
            <div className="space-y-4 h-full flex flex-col">
                <input 
                    value={selectedTopic.title} 
                    onChange={(e) => updateTopic(selectedTopic.id, { title: e.target.value })}
                    className="w-full text-4xl font-black text-slate-900 bg-transparent outline-none p-2 border-b-2 border-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="Topic Title..."
                />
                
                <div className='flex flex-wrap gap-3 p-2 border-b border-white/20 items-center sticky top-0 bg-white/30 backdrop-blur-xl z-20 rounded-xl'>
                    <div className="flex gap-1 bg-white/40 p-1 rounded-lg">
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
                          const html = `<div style="background: rgba(248,250,252,0.8); border-left: 6px solid #64748b; padding: 16px; border-radius: 8px; margin: 15px 0; font-style: italic; color: #334155;">Block information...</div><p><br></p>`;
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
                          const html = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;"><div style="border: 1px dashed rgba(0,0,0,0.1); padding: 15px; border-radius: 12px;">Column 1</div><div style="border: 1px dashed rgba(0,0,0,0.1); padding: 15px; border-radius: 12px;">Column 2</div></div><p><br></p>`;
                          document.execCommand('insertHTML', false, html);
                        }}
                      >
                        <Layout size={16} />
                      </button>
                    </div>

                    <div className="h-6 w-px bg-white/30 mx-1" />

                    <div className="flex items-center gap-2 bg-white/40 p-1 px-3 rounded-lg border border-white/40 transition-all">
                      <Highlighter size={14} className={activeColor ? 'text-orange-500 animate-pulse' : 'text-slate-400'} />
                      <div className="flex gap-1.5">
                        {colors.map(c => (
                          <button
                            key={c.value}
                            onClick={() => setActiveColor(activeColor === c.value ? null : c.value)}
                            className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 shadow-sm ${activeColor === c.value ? 'border-orange-500 scale-125' : 'border-white/40'}`}
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
                      <button onClick={enhanceWithAI} disabled={isAILoading} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 shadow-sm transition-colors disabled:opacity-50">
                        {isAILoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        AI Enhance
                      </button>
                      <button onClick={insertDate} className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 shadow-sm transition-colors">
                        <Calendar size={14} /> Insert Date
                      </button>
                    </div>
                </div>

                {/* Floating Selection Tooltip */}
                {pickerPos && (
                  <div 
                    className="fixed z-50 bg-white/90 backdrop-blur p-2 rounded-2xl shadow-2xl border border-white flex gap-2 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200"
                    style={{ 
                      left: pickerPos.x, 
                      top: pickerPos.y, 
                      transform: 'translateX(-50%)' 
                    }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
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
                      fontSize: `${dpssSettings.fontSize}px`,
                      fontFamily: dpssSettings.fontFamily
                    }}
                    className="w-full flex-1 bg-white/5 outline-none p-8 rounded-3xl text-slate-800 leading-relaxed font-medium transition-all focus:bg-white/20"
                />
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <MousePointer2 size={32} />
              </div>
              <p className="font-bold text-lg">Select a topic to start editing</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default DPSSTable;

