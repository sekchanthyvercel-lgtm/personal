import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Calendar, AlignLeft, AlignCenter, AlignRight, Highlighter, MousePointer2, Minus, Layout, Square, Quote, Settings2, FileUp, Image as ImageIcon, Video, Music, FileText, Loader2, Wand2, Menu, ChevronLeft, GraduationCap, ChevronRight, Table, Grid3X3, Columns, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Palette, Italic, Underline, Strikethrough, Indent, Outdent, List, ListOrdered, CheckSquare } from 'lucide-react';
import { AppData, DPSSTopic } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { callNeuralEngine } from '../services/neuralEngine';
import { AISelfLearningModal } from './AISelfLearningModal';
import { PAPER_STYLES } from '../src/styles/paperStyles';

interface SelfLearningTableProps {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onUpdateTopic?: (updatedTopics: DPSSTopic[], topicToSave?: DPSSTopic) => void;
  onOpenSidebar?: () => void;
}

export const SelfLearningTable: React.FC<SelfLearningTableProps> = ({ data, onUpdate, onUpdateTopic, onOpenSidebar }) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showMoreTools, setShowMoreTools] = useState(false);
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
    { name: 'Red', value: '#fee2e2' },
    { name: 'Purple', value: '#f3e8ff' },
    { name: 'Teal', value: '#ccfbf1' },
    { name: 'Cyan', value: '#cffafe' },
    { name: 'Lime', value: '#ecfccb' },
    { name: 'Amber', value: '#fef3c7' },
    { name: 'Rose', value: '#ffe4e6' },
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#ffffff' },
    { name: 'Clear', value: 'transparent' }
  ];

  const textColors = [
    { name: 'Slate', value: '#334155' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Fuchsia', value: '#d946ef' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
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
  const paperStyle = dpssSettings.paperStyle || 'none';
  const selectedPaper = PAPER_STYLES.find(s => s.id === paperStyle) || PAPER_STYLES[0];

  const filterTopics = (items: DPSSTopic[]): DPSSTopic[] => {
    return items
      .filter(t => !t.deletedAt)
      .map(t => ({
        ...t,
        content: typeof t.content === 'string' ? t.content : '',
        alignment: t.alignment || 'left',
        children: t.children ? filterTopics(t.children) : []
      }));
  };

  const topics = React.useMemo(() => {
    return filterTopics(data.selfLearningTopics || []);
  }, [data.selfLearningTopics]);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
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

  const applyTextColor = (color: string, selectionProvided: boolean = false) => {
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
      document.execCommand('foreColor', false, color);
    }
    
    if (!selectionProvided) {
      selection.removeAllRanges();
      savedRange.current = null;
      setPickerPos(null);
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

  const findRootTopic = (items: DPSSTopic[], childId: string): DPSSTopic | null => {
    for (const item of items) {
      if (item.id === childId) return item;
      const found = findTopic(item.children || [], childId);
      if (found) return item;
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
    const updated = updateTopics(data.selfLearningTopics || []);
    if (onUpdateTopic) {
      if (!parentId) {
        onUpdateTopic(updated, newTopic);
      } else {
        const root = findRootTopic(updated, parentId);
        onUpdateTopic(updated, root || undefined);
      }
    } else {
      onUpdate({ ...data, selfLearningTopics: updated });
    }
  };

  const deleteTopic = (id: string) => {
    if (confirm('Move this topic to Recycle Bin?')) {
      const markDeleted = (items: DPSSTopic[]): DPSSTopic[] => {
        return items.map(item => {
          if (item.id === id) return { ...item, deletedAt: new Date().toISOString() };
          if (item.children) return { ...item, children: markDeleted(item.children) };
          return item;
        });
      };
      const updatedData = markDeleted(data.selfLearningTopics || []);
      const root = findRootTopic(data.selfLearningTopics || [], id); // Find root in old data to know which doc to update
      
      const updatedRoot = root ? findRootTopic(updatedData, root.id) : null;

      if (onUpdateTopic) {
        onUpdateTopic(updatedData, updatedRoot || undefined);
      } else {
        onUpdate({ ...data, selfLearningTopics: updatedData });
      }
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
    const updated = updateItems(data.selfLearningTopics || []);
    const root = findRootTopic(updated, id);
    if (onUpdateTopic) {
      onUpdateTopic(updated, root || undefined);
    } else {
      onUpdate({ ...data, selfLearningTopics: updated });
    }
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
  
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableConfig, setTableConfig] = useState({ rows: 5, cols: 2, hasHeader: true, theme: '#10b981', headerTitle: 'New Learning Table' });

  const insertSmartTable = () => {
    const { rows, cols, hasHeader, theme, headerTitle } = tableConfig;
    let html = `<table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 2px solid ${theme}; font-size: 14px; border-radius: 12px; overflow: hidden; display: table;">`;
    
    if (hasHeader) {
      html += `<thead><tr style="background-color: ${theme}; color: white;">
        <th colspan="${cols}" style="padding: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(255,255,255,0.2);">${headerTitle}</th>
      </tr></thead>`;
    }

    html += '<tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        const isFirstCol = c === 0;
        const cellStyle = `padding: 10px; border: 1px solid ${theme}40; min-height: 24px; transition: background 0.2s;`;
        const content = isFirstCol ? (r + 1).toString() : '';
        const textAlign = isFirstCol ? 'center' : 'left';
        const width = isFirstCol ? '40px' : 'auto';
        html += `<td style="${cellStyle} text-align: ${textAlign}; width: ${width}; font-weight: ${isFirstCol ? '800' : '500'};">${content}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';

    if (editorRef.current) {
      editorRef.current.focus();
      if (savedRange.current) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedRange.current);
      }
      document.execCommand('insertHTML', false, html);
      setIsTableModalOpen(false);
    }
  };

  const manageTable = (action: 'row-above' | 'row-below' | 'col-left' | 'col-right' | 'delete-row' | 'delete-col') => {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode) return;
    
    const cell = (selection.anchorNode as HTMLElement).closest?.('td, th') as HTMLTableCellElement;
    if (!cell) return;
    
    const row = cell.parentElement as HTMLTableRowElement;
    const table = row.closest('table') as HTMLTableElement;
    if (!table) return;

    const rowIndex = row.rowIndex;
    const colIndex = cell.cellIndex;

    if (action === 'row-above') {
      const newRow = table.insertRow(rowIndex);
      for (let i = 0; i < row.cells.length; i++) {
        const newCell = newRow.insertCell(i);
        newCell.style.cssText = row.cells[i].style.cssText;
        newCell.innerHTML = '&nbsp;';
      }
    } else if (action === 'row-below') {
      const newRow = table.insertRow(rowIndex + 1);
      for (let i = 0; i < row.cells.length; i++) {
        const newCell = newRow.insertCell(i);
        newCell.style.cssText = row.cells[i].style.cssText;
        newCell.innerHTML = '&nbsp;';
      }
    } else if (action === 'col-left') {
      for (let i = 0; i < table.rows.length; i++) {
        const r = table.rows[i];
        if (r.cells[0].colSpan > 1) continue;
        const newCell = r.insertCell(colIndex);
        newCell.style.cssText = cell.style.cssText;
        newCell.innerHTML = '&nbsp;';
      }
    } else if (action === 'col-right') {
      for (let i = 0; i < table.rows.length; i++) {
        const r = table.rows[i];
        if (r.cells[0].colSpan > 1) continue;
        const newCell = r.insertCell(colIndex + 1);
        newCell.style.cssText = cell.style.cssText;
        newCell.innerHTML = '&nbsp;';
      }
    } else if (action === 'delete-row') {
      table.deleteRow(rowIndex);
    } else if (action === 'delete-col') {
      for (let i = 0; i < table.rows.length; i++) {
        const r = table.rows[i];
        if (r.cells[0].colSpan > 1) continue;
        if (r.cells.length > colIndex) {
          r.deleteCell(colIndex);
        }
      }
    }

    if (editorRef.current) {
      updateTopic(selectedTopic!.id, { content: editorRef.current.innerHTML });
    }
  };

  const insertDate = () => {
    if (!selectedTopic) return;
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedDate = `<div style="color: #10b981; font-weight: 800; font-size: 1.2em; border-left: 4px solid #10b981; padding-left: 12px; margin: 10px 0;">${dateStr}</div>`;
    const newContent = formattedDate + selectedTopic.content;
    updateTopic(selectedTopic.id, { content: newContent });
    if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
    }
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
        improved = improved.replace(/^`{3}(html)?\n?/i, '').replace(/`{3}$/, '').trim();
        
        updateTopic(selectedTopic.id, { content: improved });
        if (editorRef.current) {
            editorRef.current.innerHTML = improved;
        }
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

    if (target.classList?.contains('task-checkbox') && target.getAttribute('contenteditable') === 'false') {
        const text = target.innerText.trim();
        const toggles: Record<string, string> = {
            '⬜': '✅', '✅': '⬜',
            '[ ]': '[x]', '[x]': '[ ]',
            '🔳': '✅',
            '⚪': '🟢', '🟢': '⚪',
            '🔴': '🟢',
            '❎': '✅',
            '✓': '✗', '✗': '✓'
        };
        if (toggles[text]) {
            target.innerText = toggles[text];
            if (selectedTopic?.id && editorRef.current) {
                updateTopic(selectedTopic.id, { content: editorRef.current.innerHTML });
            }
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

  useEffect(() => {
    if (editorRef.current && selectedTopic && editorRef.current.innerHTML !== selectedTopic.content) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = selectedTopic.content;
      }
    }
  }, [selectedTopic?.id, selectedTopic?.content]);

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
      <div className={`flex-1 bg-transparent rounded-3xl p-4 md:p-6 border border-white/20 relative overflow-hidden flex flex-col ${!isSidebarOpen ? 'w-full' : 'hidden md:flex'}`}>
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
                      <button className="p-1.5 hover:bg-white rounded transition-colors" title="Italic" onClick={() => document.execCommand('italic')}><Italic size={14} /></button>
                      <button className="p-1.5 hover:bg-white rounded transition-colors" title="Underline" onClick={() => document.execCommand('underline')}><Underline size={14} /></button>
                      <button className="p-1.5 hover:bg-white rounded transition-colors" title="Strikethrough" onClick={() => document.execCommand('strikeThrough')}><Strikethrough size={14} /></button>
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

                      <button 
                        className="p-1.5 hover:bg-emerald-500 hover:text-white rounded transition-all text-slate-700 font-bold flex items-center gap-1 px-2" 
                        title="Smart Table Builder"
                        onClick={() => setIsTableModalOpen(true)}
                      >
                        <Table size={16} />
                        <span className="text-[10px] uppercase">Table</span>
                      </button>
                    </div>

                    <div className="h-6 w-px bg-white/30 mx-1" />

                    <button 
                      onClick={() => setShowMoreTools(!showMoreTools)}
                      className={`p-1.5 rounded-lg font-black text-[10px] uppercase transition-all flex items-center gap-1 ${showMoreTools ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/40 text-slate-600 hover:bg-white/60'}`}
                    >
                      <Settings2 size={14} className={showMoreTools ? 'animate-spin-slow' : ''} />
                      {showMoreTools ? 'Hide' : 'More'}
                    </button>

                    {showMoreTools && (
                      <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="h-6 w-px bg-white/30 mx-1" />
                        
                        <div className="flex gap-1 bg-white/40 p-1 rounded-lg shrink-0">
                           <div className="relative group/list z-[150]">
                            <button className="p-1.5 hover:bg-white rounded transition-colors text-slate-700 font-bold text-xs flex items-center gap-1" title="Bullets"><List size={14} /> <span className="text-[10px]">▼</span></button>
                            <div className="absolute hidden group-hover/list:grid grid-cols-5 gap-1 top-full left-0 bg-white shadow-xl border border-slate-200 p-2 rounded-xl z-[200] w-[180px]">
                               {['•','🌹','⭐','🚗','❤️','✅','✨','🔥','🔮','🍃','🎵','👑','☀️','🌙','💎'].map(marker => (
                                 <button key={marker} onClick={() => {
                                    const html = `<ul style="list-style-type: none; padding-left: 20px;"><li>${marker} &nbsp;</li></ul><div><br></div>`;
                                    document.execCommand('insertHTML', false, html);
                                 }} className="p-1 hover:bg-slate-100 rounded text-center text-sm">{marker}</button>
                               ))}
                            </div>
                          </div>

                          <div className="relative group/list2 z-[150]">
                            <button className="p-1.5 hover:bg-white rounded transition-colors text-slate-700 font-bold text-xs flex items-center gap-1" title="Numbers"><ListOrdered size={14} /> <span className="text-[10px]">▼</span></button>
                            <div className="absolute hidden group-hover/list2:flex flex-col gap-1 top-full left-0 bg-white shadow-xl border border-slate-200 p-2 rounded-xl z-[200] w-[120px]">
                               {[ {n: '1.', t: 'decimal'}, {n:'1)', t: 'ol'}, {n:'1-', t: 'ol'}, {n:'I.', t:'upper-roman'}, {n:'i.', t:'lower-roman'}, {n:'A.', t:'upper-alpha'}, {n:'a.', t:'lower-alpha'}, {n:'①', t:'ol'} ].map(marker => (
                                 <button key={marker.n} onClick={() => {
                                    let html = '';
                                    if (marker.t === 'ol') {
                                       html = `<ul style="list-style-type: none; padding-left: 20px;"><li>${marker.n} &nbsp;</li></ul><div><br></div>`;
                                    } else {
                                       html = `<ol style="list-style-type: ${marker.t}; padding-left: 20px;"><li>&nbsp;</li></ol><div><br></div>`;
                                    }
                                    document.execCommand('insertHTML', false, html);
                                 }} className="p-1 hover:bg-slate-100 rounded text-left text-xs font-bold">{marker.n} Type</button>
                               ))}
                            </div>
                          </div>

                          <div className="relative group/list3 z-[150]">
                            <button className="p-1.5 hover:bg-white rounded transition-colors text-slate-700 font-bold text-xs flex items-center gap-1" title="Checklist"><CheckSquare size={14} /> <span className="text-[10px]">▼</span></button>
                            <div className="absolute hidden group-hover/list3:grid grid-cols-2 gap-1 top-full left-0 bg-white shadow-xl border border-slate-200 p-2 rounded-xl z-[200] w-[140px]">
                               {['⬜', '[ ]', '🔳', '⚪', '🔴', '❎', '✓'].map((marker, idx) => (
                                 <button key={idx} onClick={() => {
                                    const html = `<ul style="list-style-type: none; padding-left: 20px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">${marker}</span><span>&nbsp;</span></li></ul><div><br></div>`;
                                    document.execCommand('insertHTML', false, html);
                                 }} className="p-1 hover:bg-slate-100 rounded text-center text-xs" dangerouslySetInnerHTML={{__html: marker}}></button>
                               ))}
                            </div>
                          </div>
                        </div>

                        <div className="h-6 w-px bg-white/30 mx-1" />

                        <div className="flex gap-1 bg-white/40 p-1 rounded-lg shrink-0">
                          <button className="p-1.5 hover:bg-white rounded transition-colors" title="Outdent" onClick={() => document.execCommand('outdent')}><Outdent size={14} /></button>
                          <button className="p-1.5 hover:bg-white rounded transition-colors" title="Indent" onClick={() => document.execCommand('indent')}><Indent size={14} /></button>
                        </div>

                        <div className="h-6 w-px bg-white/30 mx-1" />

                        <div className="flex gap-1 bg-white/40 p-1 rounded-lg shrink-0">
                          <button className="p-1.5 hover:bg-white rounded transition-colors" title="Align Left" onClick={() => updateTopic(selectedTopic.id, { alignment: 'left' })}><AlignLeft size={16} /></button>
                          <button className="p-1.5 hover:bg-white rounded transition-colors" title="Align Center" onClick={() => updateTopic(selectedTopic.id, { alignment: 'center' })}><AlignCenter size={16} /></button>
                          <button className="p-1.5 hover:bg-white rounded transition-colors" title="Align Right" onClick={() => updateTopic(selectedTopic.id, { alignment: 'right' })}><AlignRight size={16} /></button>
                        </div>

                        <div className="h-6 w-px bg-white/30 mx-1" />

                        <div className="flex gap-1 bg-white/40 p-1 rounded-lg shrink-0">
                           <button onClick={() => manageTable('row-above')} className="p-1.5 hover:bg-white rounded text-slate-600" title="Insert Row Above"><ArrowUp size={14} /></button>
                           <button onClick={() => manageTable('row-below')} className="p-1.5 hover:bg-white rounded text-slate-600" title="Insert Row Below"><ArrowDown size={14} /></button>
                           <button onClick={() => manageTable('col-left')} className="p-1.5 hover:bg-white rounded text-slate-600" title="Insert Col Left"><ArrowLeft size={14} /></button>
                           <button onClick={() => manageTable('col-right')} className="p-1.5 hover:bg-white rounded text-slate-600" title="Insert Col Right"><ArrowRight size={14} /></button>
                           <div className="w-px h-4 bg-black/10 mx-1 self-center" />
                           <button onClick={() => manageTable('delete-row')} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="Delete Row"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    )}

                    <div className="h-6 w-px bg-white/30 mx-1" />

                    <div className="flex gap-1 bg-white/40 p-1 rounded-lg shrink-0 overflow-visible z-[150]">
                      <div className="flex items-center gap-2 relative group/textcolor">
                        <button className="flex items-center gap-1 p-0.5 hover:bg-white rounded transition-colors" title="Font Color">
                          <Palette size={14} className="text-slate-600" />
                          <span className="text-[10px] text-slate-500">▼</span>
                        </button>
                        <div className="absolute hidden group-hover/textcolor:grid grid-cols-4 gap-2 top-full right-0 bg-white shadow-xl border border-slate-200 p-2 rounded-xl w-[130px]">
                          {textColors.map(c => (
                            <button
                              key={c.value}
                              onClick={() => applyTextColor(c.value, true)}
                              className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 shadow-sm mx-auto border-slate-200`}
                              style={{ backgroundColor: c.value === 'transparent' ? '#f8fafc' : c.value }}
                              title={c.name}
                            >
                              {c.value === 'transparent' && <span className="text-[8px] font-black opacity-30">✕</span>}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="w-px h-4 bg-white/30 self-center mx-1" />

                      <div className="flex items-center gap-2 relative group/color">
                        <button className="flex items-center gap-1 p-0.5 hover:bg-white rounded transition-colors" title="Highlight Color">
                          <Highlighter size={14} className={activeColor ? 'text-emerald-500 animate-pulse' : 'text-slate-600'} />
                          <span className="text-[10px] text-slate-500">▼</span>
                        </button>
                        <div className="absolute hidden group-hover/color:grid grid-cols-5 gap-2 top-full right-0 bg-white shadow-xl border border-slate-200 p-2 rounded-xl w-[160px]">
                          {colors.map(c => (
                            <button
                              key={c.value}
                              onClick={() => {
                                setActiveColor(activeColor === c.value ? null : c.value);
                                applyColor(c.value, true); 
                              }}
                              className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 shadow-sm mx-auto ${activeColor === c.value ? 'border-emerald-500 scale-125' : 'border-slate-200'}`}
                              style={{ backgroundColor: c.value === 'transparent' ? '#f8fafc' : c.value }}
                              title={c.name}
                            >
                              {c.value === 'transparent' && <span className="text-[8px] font-black opacity-30">✕</span>}
                            </button>
                          ))}
                        </div>
                        {activeColor && (
                          <button onClick={() => setActiveColor(null)} className="text-[9px] font-black bg-white/60 hover:bg-white px-1.5 rounded uppercase tracking-tighter text-slate-500">
                            Stop
                          </button>
                        )}
                      </div>
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
                    className="fixed z-50 bg-white/90 backdrop-blur p-2 rounded-2xl shadow-2xl border border-white flex gap-3 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200"
                    style={{ left: pickerPos.x, top: pickerPos.y, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="flex gap-2 items-center">
                      <Palette size={14} className="text-slate-400" />
                      <div className="flex gap-1">
                        {textColors.map(color => (
                            <button 
                                key={color.value}
                                className={`w-5 h-5 rounded-full border border-black/5 hover:scale-110 transition-transform ${color.value === 'transparent' ? 'bg-slate-100 flex items-center justify-center' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => applyTextColor(color.value)}
                                title={color.name}
                            >
                              {color.value === 'transparent' && <span className="text-[8px] font-black opacity-40">✕</span>}
                            </button>
                        ))}
                      </div>
                    </div>
                    <div className="w-px h-5 bg-slate-200 self-center" />
                    <div className="flex gap-2 items-center">
                      <Highlighter size={14} className="text-slate-400" />
                      <div className="flex gap-1">
                        {colors.map(color => (
                            <button 
                                key={color.value}
                                className={`w-5 h-5 rounded-full border border-black/5 hover:scale-110 transition-transform ${color.value === 'transparent' ? 'bg-slate-100 flex items-center justify-center' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => applyColor(color.value)}
                                title={color.name}
                            >
                              {color.value === 'transparent' && <span className="text-[8px] font-black opacity-40">✕</span>}
                            </button>
                        ))}
                      </div>
                    </div>
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
                    style={{ 
                      textAlign: selectedTopic.alignment, 
                      minHeight: '300px',
                      fontSize: `${textFontSize}px`,
                      fontFamily: textFontFamily
                    }}
                    className={`w-full flex-1 outline-none p-8 rounded-3xl text-slate-800 leading-relaxed font-medium transition-all focus:ring-4 focus:ring-emerald-500/10 overflow-y-auto shadow-md ${selectedPaper.className}`}
                ></div>

                {isTableModalOpen && (
                  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl border border-slate-200 animate-in zoom-in duration-300">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                           <Table size={24} strokeWidth={3} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Smart Learning Table</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organize your learning modules</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Subject/Topic Title</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-emerald-500 transition-all font-sans"
                            value={tableConfig.headerTitle}
                            onChange={(e) => setTableConfig({...tableConfig, headerTitle: e.target.value})}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Rows</label>
                            <input 
                              type="number" 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-emerald-500"
                              value={tableConfig.rows}
                              onChange={(e) => setTableConfig({...tableConfig, rows: parseInt(e.target.value) || 1})}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Columns</label>
                            <select 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-emerald-500"
                              value={tableConfig.cols}
                              onChange={(e) => setTableConfig({...tableConfig, cols: parseInt(e.target.value)})}
                            >
                              {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n} Columns</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 py-2">
                           <input 
                             type="checkbox" 
                             id="hasHeaderSl" 
                             checked={tableConfig.hasHeader}
                             onChange={(e) => setTableConfig({...tableConfig, hasHeader: e.target.checked})}
                             className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                           />
                           <label htmlFor="hasHeaderSl" className="text-sm font-bold text-slate-700 cursor-pointer">Include Header Row</label>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Theme Color</label>
                          <div className="flex gap-2">
                             {['#f97316', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#000000', '#ffffff', '#64748b', '#f43f5e', '#d946ef', '#14b8a6', '#0ea5e9', '#84cc16', '#eab308', '#ec4899'].map(c => (
                               <button 
                                 key={c}
                                 onClick={() => setTableConfig({...tableConfig, theme: c})}
                                 className={`w-8 h-8 rounded-full border-2 transition-all ${tableConfig.theme === c ? 'border-emerald-500 scale-125' : 'border-white'}`}
                                 style={{ backgroundColor: c }}
                               />
                             ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-10">
                        <button 
                          onClick={() => setIsTableModalOpen(false)}
                          className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={insertSmartTable}
                          className="flex-1 py-4 bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all"
                        >
                          Generate Table
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
    </div>
  );
};

export default SelfLearningTable;
